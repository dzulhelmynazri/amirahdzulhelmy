"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@atlas/ui/components/alert-dialog";
import { Button } from "@atlas/ui/components/button";
import { Spinner } from "@atlas/ui/components/spinner";
import { formatCurrency } from "@atlas/utils/currency";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, CreditCard, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { Booking, BookingStatus } from "@/types/bookings";
import { trpc } from "@/utils/trpc";

type LifecycleAction = "pay" | "refund" | "void";

/** Row buttons offered per status; terminal statuses (voided, refunded) show none. */
const statusActions: Partial<Record<BookingStatus, LifecycleAction[]>> = {
  confirmed: ["void"],
  created: ["pay", "void"],
  issued: ["refund"],
};

const actionIcons: Record<LifecycleAction, typeof CreditCard> = {
  pay: CreditCard,
  refund: Undo2,
  void: Ban,
};

const actionLabels: Record<LifecycleAction, string> = {
  pay: "Pay & issue",
  refund: "Refund",
  void: "Void",
};

const dialogCopy: Record<
  LifecycleAction,
  { confirm: string; destructive: boolean; title: string }
> = {
  pay: {
    confirm: "Confirm payment",
    destructive: false,
    title: "Pay & issue this order?",
  },
  refund: {
    confirm: "Request refund",
    destructive: true,
    title: "Refund this order?",
  },
  void: {
    confirm: "Void order",
    destructive: true,
    title: "Void this order?",
  },
};

const buildDescription = (
  action: LifecycleAction,
  booking: Booking
): string => {
  if (action === "pay") {
    return `Charges ${formatCurrency(Number(booking.totalAmount ?? 0), booking.currency)} to the sandbox payment method and issues the tickets. This cannot be undone.`;
  }
  if (action === "refund") {
    return "Submits a refund request to Atlas for this issued order. The tickets are cancelled once the refund completes.";
  }
  return "Cancels the order and releases the seats. Voiding is irreversible.";
};

const successMessages: Record<LifecycleAction, string> = {
  pay: "Paid — tickets issuing",
  refund: "Refund requested",
  void: "Order voided",
};

/** Lifecycle action buttons for one booking row, each behind a confirm dialog. */
export const RowActions = ({ booking }: { booking: Booking }) => {
  const actions = statusActions[booking.status as BookingStatus] ?? [];
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(
    null
  );
  const queryClient = useQueryClient();

  const onActionSuccess = async (action: LifecycleAction) => {
    toast.success(`${successMessages[action]} · ${booking.orderNo}`);
    setPendingAction(null);
    await Promise.all([
      queryClient.invalidateQueries(trpc.booking.details.queryFilter()),
      queryClient.invalidateQueries(trpc.booking.incidents.queryFilter()),
      queryClient.invalidateQueries(trpc.booking.list.queryFilter()),
    ]);
  };

  const payMutation = useMutation({
    ...trpc.booking.pay.mutationOptions(),
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => onActionSuccess("pay"),
  });
  const refundMutation = useMutation({
    ...trpc.booking.refund.mutationOptions(),
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => onActionSuccess("refund"),
  });
  const voidMutation = useMutation({
    ...trpc.booking.void.mutationOptions(),
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => onActionSuccess("void"),
  });

  const mutations: Record<LifecycleAction, typeof payMutation> = {
    pay: payMutation,
    refund: refundMutation,
    void: voidMutation,
  };

  if (actions.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const action = pendingAction;
  const activeMutation = action ? mutations[action] : null;
  const isPending = activeMutation?.isPending ?? false;

  return (
    <div className="flex justify-end gap-1.5">
      {actions.map((rowAction) => {
        const Icon = actionIcons[rowAction];
        return (
          <Button
            key={rowAction}
            onClick={() => {
              setPendingAction(rowAction);
            }}
            size="sm"
            variant="outline"
          >
            <Icon data-icon="inline-start" />
            {actionLabels[rowAction]}
          </Button>
        );
      })}
      {action && activeMutation ? (
        <AlertDialog
          onOpenChange={(open) => {
            if (!open && !isPending) {
              setPendingAction(null);
            }
          }}
          open
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogCopy[action].title}</AlertDialogTitle>
              <AlertDialogDescription>
                {buildDescription(action, booking)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={() => {
                  activeMutation.mutate({ orderNo: booking.orderNo });
                }}
                variant={
                  dialogCopy[action].destructive ? "destructive" : "default"
                }
              >
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                {dialogCopy[action].confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
};
