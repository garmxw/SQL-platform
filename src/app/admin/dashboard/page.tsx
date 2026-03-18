import AppPieChart from "@/components/AppPieChart";
import AppAreaChart from "@/components/AppAreaChart";
import AppBarChart from "@/components/AppBarChart";
import CardList from "@/components/CardList";
import TodoList from "@/components/TodoList";

function dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
      <div className="bg-primary-foreground p-4 rounded-lg lg:col-span-2 xl:col-span-1 2xl:col-span-2 ring-1 ring-foreground/10 ">
        <AppBarChart />
      </div>

      <div className="bg-primary-foreground ring-1 ring-foreground/10  p-4 border-accent-foreground rounded-lg">
        <CardList title={"Recent Transactions"} />
      </div>

      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <AppPieChart />
      </div>

      <div className="bg-primary-foreground ring-1 ring-foreground/10  p-4 rounded-lg">
        <TodoList />
      </div>

      <div className="bg-primary-foreground ring-1 ring-foreground/10  p-4 rounded-lg lg:col-span-2 xl:col-span-1 2xl:col-span-2">
        <AppAreaChart />
      </div>

      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <CardList title={"Popular Content"} />
      </div>
    </div>
  );
}

export default dashboard;
