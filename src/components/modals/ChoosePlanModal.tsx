import React from 'react';

const ChoosePlanModal: React.FC = () => {
  const handleRedirect = () => {
    window.location.href = 'https://merry-axolotl-958eca.netlify.app/';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* טשטוש עדין ושכבת שקיפות */}
      <div className="absolute inset-0 backdrop-blur-sm backdrop-brightness-100 bg-white/20" />

      {/* תוכן המודל */}
      <div className="relative z-10 bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
        <h2 className="text-xl font-semibold mb-2">תקופת הניסיון הסתיימה</h2>
        <p className="text-gray-600 mb-4">
          כדי להמשיך להשתמש במערכת – יש לבחור מסלול פעילות.
        </p>
        <button
          onClick={handleRedirect}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          עבור לבחירת מסלול
        </button>
      </div>
    </div>
  );
};

export default ChoosePlanModal;
