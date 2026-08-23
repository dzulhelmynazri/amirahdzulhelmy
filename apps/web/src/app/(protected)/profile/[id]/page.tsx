import { Skeleton } from "@atlas/ui/components/skeleton";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getTraveller } from "@/app/actions/travellers";
import { TravellerForm } from "@/components/profile/traveller-form";

/**
 * Loads one traveller and hands it to the form.
 *
 * The row is read on the server, so the form arrives with its values already
 * in place, and an id that is not this account's becomes a real 404 instead of
 * a blank form that looks like an edit screen and would quietly add a second
 * person when saved.
 */
const TravellerEditor = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const row = await getTraveller(id);

  if (!row) {
    notFound();
  }

  return (
    <TravellerForm
      initial={{
        birthday: row.birthday,
        documentExpiry: row.documentExpiry ?? "",
        documentIssuePlace: row.documentIssuePlace ?? "",
        documentNumber: row.documentNumber ?? "",
        email: row.email ?? "",
        gender: row.gender,
        id: row.id,
        isPrimary: row.isPrimary,
        name: row.name,
        nationality: row.nationality ?? "",
        phone: row.phone ?? "",
      }}
    />
  );
};

/**
 * Both the id and the traveller behind it are resolved inside the boundary.
 *
 * Awaiting `params` out here would be enough on its own to hold up the whole
 * navigation: the shell cannot render until the URL is read. Passing the
 * promise down lets the heading paint immediately while the form streams in.
 */
export default function EditTravellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <TravellerEditor params={params} />
    </Suspense>
  );
}
