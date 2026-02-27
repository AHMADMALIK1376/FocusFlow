import React from "react";
import "../Style/logo.css";

export default function Logo({ size = "small", showText = false }) {
return (
<div className={`logo-container ${size}`}>
<div className="glass-icon-box">
<img src="/flow1.png" alt="FocusFlow" className="logo-img" />
</div>
</div>
);
}