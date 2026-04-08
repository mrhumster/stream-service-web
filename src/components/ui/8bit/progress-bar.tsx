import { Progress } from "radix-ui";

const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <Progress.Root
      className="relative h-[25px] w-[300px] overflow-hidden rounded-full bg-blackA6"
      style={{
        transform: "translateZ(0)",
      }}
      value={progress}
    >
      <Progress.Indicator
        className="ease-[cubic-bezier(0.65, 0, 0.35, 1)] size-full bg-white transition-transform duration-[660ms]"
        style={{ transform: `translateX(-${100 - progress}%)` }}
      />
    </Progress.Root>
  );
};

export default ProgressBar;
