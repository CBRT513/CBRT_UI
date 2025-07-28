// src/components/PageHeader.jsx
import React from 'react';
import { PlusIcon } from './Icons';

const PageHeader = ({ title, subtitle, buttonText, onAdd, extraButtons }) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h2 className="text-2xl font-bold text-green-800">{title}</h2>
      <p className="text-gray-600">{subtitle}</p>
    </div>
    <div className="flex gap-2">
      {extraButtons}
      {buttonText && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded shadow hover:opacity-90"
        >
          <PlusIcon /> <span>{buttonText}</span>
        </button>
      )}
    </div>
  </div>
);

export default PageHeader;