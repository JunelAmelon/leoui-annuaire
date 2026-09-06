'use client';

import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
const IS_URL = /https?:\/\/[^\s]+/i;

export default function LinkifyText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) =>
        IS_URL.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold break-all"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
