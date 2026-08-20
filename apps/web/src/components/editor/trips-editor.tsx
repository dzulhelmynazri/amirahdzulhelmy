"use client";

import { Editor, EditorContainer } from "@atlas/ui/components/editor";
import { FixedToolbar } from "@atlas/ui/components/fixed-toolbar";
import { useMutation } from "@tanstack/react-query";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { TripsEditorKit } from "@/components/editor/trips-editor-kit";
import { TripsToolbarButtons } from "@/components/editor/trips-toolbar-buttons";
import { trpc } from "@/utils/trpc";

interface TripData {
  content?: unknown;
  id: string;
  title: string;
}

/** Fresh empty doc — never reuse node objects across editor instances. */
const createEmptyValue = (): Value => [{ children: [{ text: "" }], type: "p" }];

/**
 * Clone so Slate's NODE_TO_PARENT WeakMap keys are unique per editor mount.
 * Reusing the same node refs (shared defaultValue, React Query cache, Strict
 * Mode remount) makes findPath throw "Unable to find the path for Slate node".
 */
const cloneEditorValue = (content: unknown): Value => {
  if (!content) {
    return createEmptyValue();
  }
  return structuredClone(content) as Value;
};

const TripsEditor = ({ trip }: { trip: TripData }) => {
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTrip = useMutation(trpc.trips.update.mutationOptions({}));

  const editor = usePlateEditor({
    id: trip.id,
    plugins: TripsEditorKit,
    value: () => cloneEditorValue(trip.content),
  });

  const scheduleSave = React.useCallback(
    (content: Value) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        updateTrip.mutate({ content, id: trip.id });
      }, 1500);
    },
    [trip.id, updateTrip]
  );

  return (
    <Plate
      editor={editor}
      onChange={({ value }) => {
        scheduleSave(value);
      }}
    >
      <EditorContainer variant="default">
        <FixedToolbar className="p-3">
          <TripsToolbarButtons />
        </FixedToolbar>
        <Editor className="min-h-full px-8 pt-4" variant="none" />
      </EditorContainer>
    </Plate>
  );
};

export default TripsEditor;
