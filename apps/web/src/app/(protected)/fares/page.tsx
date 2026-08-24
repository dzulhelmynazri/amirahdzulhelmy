import { Suspense } from "react";

import { FaresCompose } from "@/components/fares/fares-compose";

export default function FaresPage() {
  return (
    <Suspense>
      <FaresCompose />
    </Suspense>
  );
}
