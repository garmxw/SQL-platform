"use client";

import React, { useState } from "react";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import { Button } from "./ui/button";
import { CalendarIcon } from "lucide-react";
import { formatDate } from "date-fns";

function TodoList() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  return (
    <div className="">
      <h1 className="text-lg mb-6 font-medium">Todo List</h1>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="default" className="w-full">
            <CalendarIcon />
            {date ? formatDate(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" sideOffset={10}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => {
              setDate(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <ScrollArea className="max-h-[400px] mt-4 overflow-y-auto">
        <div className="p-3 flex flex-col gap-3">
          <Card className="p-4 mb-2">
            <div className="flex items-center gap-4">
              <Checkbox id="item1" />
              <label className="text-sm text-muted-foreground" htmlFor="item1">
                Lorem ipsum dolor sit amet consectetur adipisicing elit
              </label>
            </div>
          </Card>
          <Card className="p-4 mb-2">
            <div className="flex items-center gap-4">
              <Checkbox id="item2" />
              <label className="text-sm text-muted-foreground" htmlFor="item2">
                Lorem ipsum dolor sit amet consectetur adipisicing elit
              </label>
            </div>
          </Card>
          <Card className="p-4 mb-2">
            <div className="flex items-center gap-4">
              <Checkbox id="item3" />
              <label className="text-sm text-muted-foreground" htmlFor="item3">
                Lorem ipsum dolor sit amet consectetur adipisicing elit
              </label>
            </div>
          </Card>
          <Card className="p-4 mb-2">
            <div className="flex items-center gap-4">
              <Checkbox id="item4" />
              <label className="text-sm text-muted-foreground" htmlFor="item4">
                Lorem ipsum dolor sit amet consectetur adipisicing elit
              </label>
            </div>
          </Card>
          <Card className="p-4 mb-2">
            <div className="flex items-center gap-4">
              <Checkbox id="item5" />
              <label className="text-sm text-muted-foreground" htmlFor="item5">
                Lorem ipsum dolor sit amet consectetur adipisicing elit
              </label>
            </div>
          </Card>
          <Card className="p-4 mb-2">
            <div className="flex items-center gap-4">
              <Checkbox id="item6" />
              <label className="text-sm text-muted-foreground" htmlFor="item6">
                Lorem ipsum dolor sit amet consectetur adipisicing elit
              </label>
            </div>
          </Card>
          <Card className="p-4 mb-2">
            <div className="flex items-center gap-4">
              <Checkbox id="item7" />
              <label className="text-sm text-muted-foreground" htmlFor="item7">
                Lorem ipsum dolor sit amet consectetur adipisicing elit
              </label>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

export default TodoList;
