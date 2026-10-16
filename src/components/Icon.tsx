import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  ArrowLeft01Icon,
  PlayIcon,
  PauseIcon,
  Add01Icon,
  Cancel01Icon,
  Settings01Icon,
  Download01Icon,
  Share01Icon,
  FavouriteIcon,
  GitBranchIcon,
  DashboardSquare01Icon,
  Film01Icon,
  MagicWand01Icon,
  CheckmarkCircle01Icon,
  ArrowDown01Icon,
  Upload01Icon,
  Delete01Icon,
  Copy01Icon,
  Link01Icon,
  InformationCircleIcon,
  RefreshIcon,
  Search01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons";
const icons = {
  right: ArrowRight01Icon,
  left: ArrowLeft01Icon,
  play: PlayIcon,
  pause: PauseIcon,
  plus: Add01Icon,
  close: Cancel01Icon,
  settings: Settings01Icon,
  download: Download01Icon,
  share: Share01Icon,
  heart: FavouriteIcon,
  branch: GitBranchIcon,
  grid: DashboardSquare01Icon,
  film: Film01Icon,
  magic: MagicWand01Icon,
  check: CheckmarkCircle01Icon,
  down: ArrowDown01Icon,
  upload: Upload01Icon,
  trash: Delete01Icon,
  copy: Copy01Icon,
  link: Link01Icon,
  info: InformationCircleIcon,
  refresh: RefreshIcon,
  search: Search01Icon,
  layers: Layers01Icon,
};
export function Icon({
  name,
  size = 18,
}: {
  name: keyof typeof icons;
  size?: number;
}) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      size={size}
      strokeWidth={1.6}
      aria-hidden="true"
    />
  );
}
