import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Film, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchVideosByFacesMutation } from "@/services/faces";
import { useGetStreamQuery } from "@/services/streams";
import { StreamCard } from "@/components/stream-card";
import { StreamThumbnail } from "@/components/stream/stream-thumbnail";
import { FaceCrop } from "@/components/faces/face-crop";
import { thumbnailUrl } from "@/lib/stream-format";
import type { FacesVideoMatchMode } from "@/types/face.types";

const INITIAL_VISIBLE = 60;

const pixelBtnOutline =
  "inline-flex items-center justify-center gap-2 bg-card text-card-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold";

function formatShortId(id: string) {
  return id.slice(0, 8);
}

/** A matched video the caller may not be able to read (deleted/forbidden):
 * degrade to the raw thumbnail instead of blanking the grid. */
function FallbackTile({ streamId }: { streamId: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <Link
      to={`/streams/${streamId}`}
      className="block border-4 border-foreground/20 bg-card shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] transition-colors hover:border-primary rounded-none overflow-hidden"
    >
      <div className="relative aspect-square bg-muted border-b-2 border-foreground/10">
        {broken ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <ImageIcon className="size-8 text-muted-foreground/60" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              No Preview
            </span>
          </div>
        ) : (
          <StreamThumbnail
            src={thumbnailUrl(streamId)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <span className="block px-2.5 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-tight truncate">
        stream/{formatShortId(streamId)}
      </span>
    </Link>
  );
}

function ResultCard({
  streamId,
  persons,
  total,
  frames,
}: {
  streamId: string;
  persons: number;
  total: number;
  frames: number;
}) {
  const { data, isLoading, isError } = useGetStreamQuery(streamId);

  if (isLoading) {
    return (
      <div className="border-4 border-foreground/20 bg-card aspect-square animate-pulse rounded-none" />
    );
  }

  if (isError || !data) {
    return <FallbackTile streamId={streamId} />;
  }

  return (
    <div className="relative">
      <StreamCard stream={data} />
      {total > 1 && (
        <span className="pointer-events-none absolute top-1.5 right-1.5 z-20 bg-black/80 px-1.5 py-0.5 text-[8px] font-['Press_Start_2P'] text-white uppercase tracking-wider">
          {persons}/{total} people · {frames} frame{frames === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

type PersonRef = { id: string; name: string | null };

export const PeopleSearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const personsParam = searchParams.get("persons") ?? "";
  const ids = useMemo(
    () =>
      personsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [personsParam],
  );
  const mode: FacesVideoMatchMode =
    searchParams.get("mode") === "any" ? "any" : "all";

  const [searchVideos, { data, isLoading, isError }] =
    useSearchVideosByFacesMutation();

  useEffect(() => {
    if (ids.length === 0) return;
    void searchVideos({ cluster_ids: ids, mode });
  }, [personsParam, mode, searchVideos, ids]);

  const statePersons = (
    location.state as { persons?: PersonRef[] } | null
  )?.persons;
  const nameById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of statePersons ?? []) map.set(p.id, p.name);
    return map;
  }, [statePersons]);

  const setMode = (next: FacesVideoMatchMode) => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", next);
    setSearchParams(params, { replace: true });
  };

  const [visibleState, setVisibleState] = useState({
    key: "",
    count: INITIAL_VISIBLE,
  });
  const searchKey = `${personsParam}|${mode}`;
  if (visibleState.key !== searchKey) {
    setVisibleState({ key: searchKey, count: INITIAL_VISIBLE });
  }
  const visible = visibleState.count;

  const streams = data?.streams ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/people")}
        className="inline-flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to people
      </button>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default flex items-center gap-2">
          <Film className="size-6" />
          Find videos
        </h2>
        {ids.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {ids.map((id) => (
              <Link
                key={id}
                to={`/people/${id}`}
                className="inline-flex items-center gap-2 border-2 border-foreground/20 bg-card px-2 py-1 hover:border-primary transition-colors"
              >
                <FaceCrop clusterId={id} className="size-7" iconClassName="size-4" />
                <span className="text-[10px] uppercase font-bold tracking-tight">
                  {nameById.get(id) || `Person ${formatShortId(id)}`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {ids.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No people selected. Pick people on the People page.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex border-4 border-foreground/20">
              {(["all", "any"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 uppercase text-xs font-bold transition-colors",
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {m === "all"
                    ? `All ${ids.length} people`
                    : "Any of them"}
                </button>
              ))}
            </div>
            {data && (
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                {data.total} video{data.total === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <p className="text-center text-destructive text-sm uppercase font-bold py-12">
              Failed to search videos
            </p>
          )}

          {data && streams.length === 0 && (
            <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
              {mode === "all"
                ? `No video contains all ${ids.length} selected people`
                : "No videos contain any of the selected people"}
            </p>
          )}

          {streams.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {streams.slice(0, visible).map((m) => (
                <li key={m.stream_id}>
                  <ResultCard
                    streamId={m.stream_id}
                    persons={m.persons}
                    total={ids.length}
                    frames={m.frames}
                  />
                </li>
              ))}
            </ul>
          )}

          {streams.length > visible && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() =>
                  setVisibleState((s) => ({ ...s, count: s.count + INITIAL_VISIBLE }))
                }
                className={pixelBtnOutline}
              >
                Show {Math.min(INITIAL_VISIBLE, streams.length - visible)} more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
