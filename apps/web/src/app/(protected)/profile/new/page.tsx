import {
  TravellerForm,
  emptyTraveller,
} from "@/components/profile/traveller-form";

export default function NewTravellerPage() {
  return <TravellerForm initial={emptyTraveller} />;
}
