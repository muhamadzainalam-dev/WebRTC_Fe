import React from "react";
import { Routes, Route } from "react-router";
import "./App.css";
import Loby from "./screens/Loby";
import Room from "./screens/Room";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Loby />} />
        <Route path="/room/:id" element={<Room />} />
      </Routes>
    </div>
  );
}
