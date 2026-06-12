import { useEffect, useRef, useState } from 'react';

const BINARY = '01';

const scramble = (length) =>
  Array.from({ length }, () => BINARY[Math.floor(Math.random() * BINARY.length)]).join('');

const DecryptText = ({ text, className = '', speed = 45, startDelay = 0, as: Tag = 'span' }) => {
  const [display, setDisplay] = useState(() => scramble(text.length));
  const [done, setDone] = useState(false);
  const frameRef = useRef(null);

  useEffect(() => {
    setDone(false);
    setDisplay(scramble(text.length));
    let revealed = 0;
    let timeoutId = null;
    let intervalId = null;

    const scrambleTick = () => {
      setDisplay((prev) => {
        const fixed = text.slice(0, revealed);
        const rest = scramble(text.length - revealed);
        return fixed + rest;
      });
    };

    const start = () => {
      intervalId = setInterval(scrambleTick, 60);
      frameRef.current = setInterval(() => {
        revealed += 1;
        if (revealed >= text.length) {
          clearInterval(frameRef.current);
          clearInterval(intervalId);
          setDisplay(text);
          setDone(true);
        }
      }, speed);
    };

    timeoutId = setTimeout(start, startDelay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      clearInterval(frameRef.current);
    };
  }, [text, speed, startDelay]);

  return (
    <Tag
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-label={text}
    >
      <span aria-hidden="true" className={done ? '' : 'text-signal/90'}>
        {display}
      </span>
    </Tag>
  );
};

export default DecryptText;
