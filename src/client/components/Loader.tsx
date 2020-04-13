import React from 'react';
import './Loader.scss';

interface Props {
  loading: boolean;
  children?: JSX.Element;
  noBackground?: boolean;
  diameter?: string;
  noStretch?: boolean;
  light?: boolean;
}

const Loader: React.FC<Props> = (props) => {
  const {
    loading,
    children,
    noBackground,
    diameter = '3rem',
    noStretch,
    light,
  } = props;
  if (!loading) return children || null;

  const style = {
    width: diameter,
    height: diameter,
    borderColor: light ? 'rgba(100, 100, 100, 0.2)' : 'rgba(0, 0, 0, 0.6)',
    borderTopColor: light ? 'rgba(250, 250, 250, 0.5)' : 'rgba(0, 0, 0, 0.2)',
  };
  return (
    <div>
      <div
        className="loader"
        style={{
          backgroundColor: noBackground
            ? 'rgba(0,0,0,0)'
            : 'rgba(255,255,255,0.7)',
          position: noStretch ? undefined : 'absolute',
        }}
      >
        <div style={style} />
      </div>
      {children}
    </div>
  );
};

export default Loader;
