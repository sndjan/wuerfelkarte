import {
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  House,
  Milestone,
  ShieldHalf,
  Sigma,
  Star,
  TrafficCone,
  UserRoundPlus,
} from "lucide-react";
import AddPlayer from "./AddPlayer";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
interface CategoryIconsProps {
  addPlayer: (name: string) => void;
}

export function CategoryIcons({ addPlayer }: CategoryIconsProps) {
  return (
    <Card className="p-4 mr-4 flex-col justify-between items-center space-y-[-15px] hidden sm:flex">
      <AddPlayer addPlayer={addPlayer}>
        <Button variant="outline">
          <UserRoundPlus />
        </Button>
      </AddPlayer>
      <Dice1 />
      <Dice2 />
      <Dice3 />
      <Dice4 />
      <Dice5 />
      <Dice6 />
      <div>
        <hr className="w-full mb-3" />
        <Sigma />
        <hr className="w-full mt-3" />
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-square-stack"
      >
        <path d="M6 12c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" />
        <path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" />
        <rect width="8" height="8" x="12" y="12" rx="2" />
      </svg>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-square-stack"
      >
        <path d="M4 10c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" />
        <path d="M8 14c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" />
        <path d="M12 18c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" />
        <rect width="8" height="8" x="14" y="14" rx="2" />
      </svg>
      <House />
      <Milestone />
      <TrafficCone />
      <Star />
      <ShieldHalf className="mb-2" />
    </Card>
  );
}

export default CategoryIcons;
