import React from "react";
import PropTypes from "prop-types";

const Datev = (props: { [x: string]: any; color: any; size: any }) => {
  const { color, size, ...otherProps } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      //   viewBox="0 0 24 24"
      viewBox="0 0 88.596252 87.363747"
      //   width="779"
      //   height="768"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      style={{ transform: "translateY(-1px)" }}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...otherProps}
    >
      <defs id="defs2432" />
      <g transform="translate(20.298125,19.681875)" id="layer1">
        <path
          d="M 0.0625,67.125 L 0.0625,87.375 L 7.375,87.375 C 12.82125,87.375 17.5,83.0075 17.5,77.40625 C 17.345,71.1825 13.44625,67.124997 8,67.125 L 0.0625,67.125 z M 24.5,67.125 L 16.71875,87.375 L 21.0625,87.375 L 27.125,71.34375 L 32.125,84.09375 L 26.5,84.09375 L 26.5,87.375 L 37.71875,87.375 L 29.78125,67.125 L 24.5,67.125 z M 34.28125,67.125 L 34.28125,70.5625 L 40.84375,70.5625 L 40.84375,87.375 L 45.34375,87.375 L 45.34375,70.5625 L 51.71875,70.5625 L 51.71875,67.125 L 34.28125,67.125 z M 53.4375,67.125 L 53.4375,87.375 L 67.4375,87.375 L 67.4375,84.09375 L 57.78125,84.09375 L 57.78125,78.5 L 66.34375,78.5 L 66.34375,75.0625 L 57.78125,75.0625 L 57.78125,70.5625 L 66.96875,70.5625 L 66.96875,67.125 L 53.4375,67.125 z M 68.0625,67.125 L 76,87.375 L 80.8125,87.375 L 88.59375,67.125 L 77.875,67.125 L 77.875,70.5625 L 83,70.5625 L 78.3125,82.84375 L 72.5625,67.125 L 68.0625,67.125 z M 4.25,70.5625 L 7.6875,70.5625 C 11.11,70.5625 13.4375,73.04875 13.28125,77.25 C 13.12625,81.6075 10.17125,83.937496 6.59375,83.9375 L 4.25,83.9375 L 4.25,70.5625 z"
          transform="translate(-20.298125,-19.681875)"
          style={{
            fill: color,
            fillOpacity: 1,
            fillRule: "evenodd",
            stroke: "none",
          }}
          id="path54962"
        />
      </g>
    </svg>
  );
};

Datev.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

Datev.defaultProps = {
  size: "24",
};

export default Datev;
