import { Progress } from "radix-ui";

const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <Progress.Root
      className="relative h-[25px] w-full overflow-hidden rounded-none bg-blackA6"
      style={{
        transform: "translateZ(0)",
      }}
      value={progress}
    >
      <Progress.Indicator
        className="ease-[cubic-bezier(0.65, 0, 0.35, 1)] size-full animate-pulse  bg-zinc-900 dark:bg-zinc-50 transition-transform duration-[660ms]"
        style={{ transform: `translateX(-${100 - progress}%)` }}
      />
    </Progress.Root>
  );
};

export default ProgressBar;
