"use client";

import Image from "next/image";
import { CardContent, CardFooter, CardModified, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

const popularContent = [
  {
    id: 1,
    title: "Getting Started with React",
    badge: "Popular",
    image: "https://picsum.photos/id/1018/200/300",
    count: 1250,
  },
  {
    id: 2,
    title: "Advanced TypeScript Tips",
    badge: "Trending",
    image: "https://picsum.photos/id/1015/200/300",
    count: 980,
  },
  {
    id: 3,
    title: "Next.js Routing Guide",
    badge: "Featured",
    image: "https://picsum.photos/id/1022/200/300",
    count: 1420,
  },
  {
    id: 4,
    title: "Tailwind CSS Deep Dive",
    badge: "Recommended",
    image: "https://picsum.photos/id/1033/200/300",
    count: 1100,
  },
  {
    id: 5,
    title: "GraphQL for Beginners",
    badge: "Hot",
    image: "https://picsum.photos/id/1043/200/300",
    count: 870,
  },
];

const latestTransactions = [
  {
    id: 1,
    title: "Payment Received",
    badge: "Success",
    image: "https://i.pravatar.cc/200?u=1",
    count: 290,
  },
  {
    id: 2,
    title: "Subscription Renewal",
    badge: "Pending",
    image: "https://i.pravatar.cc/200?u=2",
    count: 100,
  },
  {
    id: 3,
    title: "Refund Processed",
    badge: "Completed",
    image: "https://i.pravatar.cc/200?u=3",
    count: 500,
  },
  {
    id: 4,
    title: "New Purchase",
    badge: "Processing",
    image: "https://i.pravatar.cc/200?u=4",
    count: 7500,
  },
  {
    id: 5,
    title: "Invoice Sent",
    badge: "Sent",
    image: "https://i.pravatar.cc/200?u=5",
    count: 1200,
  },
];

function CardList({ title }: { title: string }) {
  const list =
    title === "Popular Content" ? popularContent : latestTransactions;
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-lg mb-6 font-medium">{title}</h1>
        <div className="flex flex-col gap-2">
          {list.map((item) => (
            <CardModified key={item.id} className="flex-row items-center px-4">
              <div className="w-12 h-12 rounded-lg relative overflow-hidden shrink-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                />
              </div>
              <CardContent className="flex-1 p-0">
                <CardTitle className="text-sm font-medium">
                  {item.title}
                </CardTitle>
                <Badge className="text-[11px]" variant="secondary">
                  {item.badge}
                </Badge>
              </CardContent>
              <CardFooter className="p-0 border-none bg-transparent">
                {item.count / 1000}K
              </CardFooter>
            </CardModified>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CardList;
