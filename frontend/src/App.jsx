import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Coinflip from "./pages/Coinflip";
import Dice from "./pages/Dice";
import Crash from "./pages/Crash";
import Slots from "./pages/Slots";
import Pool from "./pages/Pool";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/coinflip" element={<Coinflip />} />
        <Route path="/dice" element={<Dice />} />
        <Route path="/crash" element={<Crash />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/pool" element={<Pool />} />
      </Routes>
    </Layout>
  );
}
