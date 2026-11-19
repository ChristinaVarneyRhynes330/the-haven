import {
  BookOpen,
  Brain,
  Briefcase,
  Church,
  Circle,
  Dumbbell,
  HeartPulse,
  Home,
  MessageCircle,
  Palette,
  PartyPopper,
  Plane,
  Scale,
  Sparkles,
  Sprout,
  User,
  Users,
  Wallet,
} from "lucide-react";

const MAP = {
  circle: Circle,
  user: User,
  users: Users,
  home: Home,
  briefcase: Briefcase,
  "heart-pulse": HeartPulse,
  brain: Brain,
  wallet: Wallet,
  "book-open": BookOpen,
  scale: Scale,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  "message-circle": MessageCircle,
  palette: Palette,
  church: Church,
  "party-popper": PartyPopper,
  plane: Plane,
  sprout: Sprout,
};

export function AreaIcon({ name, className }) {
  const Icon = MAP[name] || Circle;
  return <Icon className={className} aria-hidden="true" />;
}

export const AREA_ICON_KEYS = Object.keys(MAP);