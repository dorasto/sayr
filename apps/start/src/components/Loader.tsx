import { Spinner } from "@repo/ui/components/spinner";
export default function Loader() {
  return (
    <div className="fixed inset-0 z-99999999 flex items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        {/*<IconLoader2 className="w-12 h-12 text-primary animate-spin" />*/}
        <Spinner className="size-12 text-primary" />
        <Spinner className="size-6 direction-reverse absolute text-primary" />
        {/*<IconLoader2 className="absolute w-6 h-6 text-primary/50 animate-spin direction-reverse" />*/}
      </div>
    </div>
  );
}
