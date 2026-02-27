import React, { useEffect, useState } from "react";
import Logo from "../components/Logo";
import "../Style/Splash.css";

export default function Splash({ onComplete }) {
    const [fadeOut, setFadeOut] = useState(false);

useEffect(() => {
   const timer = setTimeout(() => setFadeOut(true), 3800);
   const removeTimer = setTimeout(onComplete, 4600);

return () => {
   clearTimeout(timer);
   clearTimeout(removeTimer);
};
}, [onComplete]);

return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
    <div className="splash-content">
    <div className="splash-logo-wrapper">
    <Logo size="large" showText={false} /> </div>

    <h1 className="splash-text">FOCUS<span>FLOW</span></h1>

    <div className="loading-bar">
    <div className="loading-progress"></div></div>

    <p className="splash-tagline">Organizing Your Daily Life</p> </div>
    </div>
);
}

