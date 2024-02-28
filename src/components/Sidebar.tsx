import React from 'react'
import "./Sidebar.css"

interface Props {
  stop: number
}

export const Sidebar: React.FC<Props> = ({stop}) => {
  return(
    <div className="sidebar">
      <h2>{"Pysäkki " + stop}</h2>
    </div>
  );
}