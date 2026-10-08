import { Dashboard } from "./components/Dashboard/Dashboard";

export function meta() {
  return [
    { title: "Панель безпеки | Сидоренко Дар'я" },
    { name: "description", content: "Моніторинг функціональної стійкості програмного комплексу SmartEnergy із використанням блокчейн-технологій" },
  ];
}

export default function App() {
  return <Dashboard />;
}