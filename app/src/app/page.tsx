import { Query } from "~/components/Query/Query";
import config from "../../../config.json";

type TemperatureHistory = {
  date: number;
  id: string;
  temperature: number;
}

const getTemperature = async () => {
  const res = await fetch(`https://api.${config.domainName}/app/read`);
  return res.json() as unknown as TemperatureHistory;
}

export default async function Page() {
  const { date, temperature } = await getTemperature();
  return (
    <>
      <Query temperature={temperature} date={date} />
    </>
  );
}
