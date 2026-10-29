import { useId } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Select10 = () => {
  const id = useId();

  return (
    <div className="w-full max-w-xs space-y-2">
      <Label htmlFor={id} className="text-muted-foreground">
        Favorite Fruit
      </Label>
      <Select defaultValue="apple">
        <SelectTrigger 
          id={id} 
          className="w-full rounded-control border-control bg-sheet hover:bg-raised"
        >
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent 
          sideOffset={4} 
          className="rounded-card border-border bg-sheet p-1"
        >
          <SelectGroup>
            <SelectLabel className="text-muted-foreground">Available Fruits</SelectLabel>
            <SelectItem value="apple" className="rounded-control">Apple</SelectItem>
            <SelectItem value="banana" className="rounded-control">Banana</SelectItem>
            <SelectItem value="blueberry" className="rounded-control">Blueberry</SelectItem>
            <SelectItem value="grapes" className="rounded-control">Grapes</SelectItem>
            <SelectItem value="pineapple" className="rounded-control">Pineapple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default Select10;
