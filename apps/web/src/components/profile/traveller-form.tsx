"use client";

import { Button } from "@atlas/ui/components/button";
import { Input } from "@atlas/ui/components/input";
import { Label } from "@atlas/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@atlas/ui/components/select";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { TravellerInput } from "@/app/actions/travellers";
import { saveTraveller } from "@/app/actions/travellers";
import {
  CountryCombobox,
  PhoneField,
} from "@/components/profile/country-fields";
import { DateField } from "@/components/profile/date-field";

/**
 * Atlas accepts only F and M, so an X passport cannot be booked through it.
 * Spelled out rather than shown as bare letters — "F" alone is a guess.
 */
const GENDERS = [
  { label: "F — female", value: "F" },
  { label: "M — male", value: "M" },
];

export const emptyTraveller: TravellerInput = {
  birthday: "",
  documentExpiry: "",
  documentIssuePlace: "",
  documentNumber: "",
  email: "",
  gender: "F",
  isPrimary: false,
  name: "",
  nationality: "",
  phone: "",
};

const Field = ({
  hint,
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  hint?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
    {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
  </div>
);

/**
 * Add or edit one traveller.
 *
 * Which traveller is open is decided by the route, not by state held here, so
 * a refresh keeps the same person on screen and the edit page can be linked to
 * and returned to with the browser's back button.
 */
export const TravellerForm = ({ initial }: { initial: TravellerInput }) => {
  const [form, setForm] = useState<TravellerInput>(initial);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();

  const onChange = (patch: Partial<TravellerInput>) =>
    setForm((previous) => ({ ...previous, ...patch }));

  // A saved row always carries a server-minted id; a blank form never does.
  const isEditing = form.id !== undefined;
  const submitLabel = isEditing ? "Save changes" : "Add traveller";

  const backToList = () => {
    router.push("/profile");
    // The list is rendered from a cached server response, so without this the
    // row just saved comes back with its old values.
    router.refresh();
  };

  const handleSubmit = () => {
    startSaving(async () => {
      const result = await saveTraveller(form);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Changes saved" : "Traveller added");
      backToList();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        className="-ml-2 self-start text-muted-foreground"
        onClick={backToList}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ArrowLeft />
        Back to travellers
      </Button>

      {/*
        Editing and adding used to look identical, which made opening a
        traveller with mostly empty fields read as a button that did nothing.
        Naming who is being edited is the difference.
      */}
      <div>
        <h2 className="font-semibold text-2xl tracking-tight">
          {isEditing ? form.name : "Add a traveller"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isEditing
            ? "Fill in whatever is missing. Blank fields are simply not saved yet."
            : "Only the name, date of birth and gender are needed to book."}
        </p>
      </div>

      <Field
        hint="Exactly as printed on the passport or IC. Airlines reject mismatches at check-in."
        id="traveller-name"
        label="Full name"
        onChange={(name) => onChange({ name: name.toUpperCase() })}
        placeholder="TAN/MEI LING"
        value={form.name}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <DateField
          id="traveller-dob"
          label="Date of birth"
          onChange={(birthday) => onChange({ birthday })}
          placeholder="1999-05-11"
          range="past"
          value={form.birthday}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="traveller-gender">Gender</Label>
          <Select
            items={GENDERS}
            onValueChange={(gender) => onChange({ gender: String(gender) })}
            value={form.gender}
          >
            <SelectTrigger className="w-full" id="traveller-gender">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            As printed on the document — the only values airlines accept here.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="traveller-doc"
          label="Passport number"
          onChange={(documentNumber) => onChange({ documentNumber })}
          placeholder="A12345678"
          value={form.documentNumber ?? ""}
        />
        <DateField
          id="traveller-doc-expiry"
          label="Passport expiry"
          onChange={(documentExpiry) => onChange({ documentExpiry })}
          placeholder="2030-01-01"
          range="future"
          value={form.documentExpiry ?? ""}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CountryCombobox
          id="traveller-nationality"
          label="Nationality"
          onChange={(nationality) => onChange({ nationality })}
          value={form.nationality ?? ""}
        />
        <CountryCombobox
          hint="The country that issued the passport, not where it was collected."
          id="traveller-issue"
          label="Issuing country"
          onChange={(documentIssuePlace) => onChange({ documentIssuePlace })}
          value={form.documentIssuePlace ?? ""}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="traveller-email"
          label="Email"
          onChange={(email) => onChange({ email })}
          placeholder="you@example.com"
          value={form.email ?? ""}
        />
        <PhoneField
          defaultIso2={form.nationality || "MY"}
          id="traveller-phone"
          label="Phone"
          onChange={(phone) => onChange({ phone })}
          value={form.phone ?? ""}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          checked={form.isPrimary ?? false}
          onChange={(event) => onChange({ isPrimary: event.target.checked })}
          type="checkbox"
        />
        Book for this person by default
      </label>

      <Button disabled={isSaving} onClick={handleSubmit} type="button">
        {isSaving ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
};
