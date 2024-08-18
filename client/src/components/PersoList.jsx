/* eslint-disable react/prop-types */
const PersoList = ({
  id,
  onClick,
  online,
  username = "", // Default empty string to prevent issues
  selectedUserId,
  onlinePeople = "", // Default empty string to prevent issues
}) => {
  return (
    <div
      onClick={() => onClick(id)}
      key={id}
      className={`border-b text-lg font-semibold border-gray-100 p-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100 ${
        id === selectedUserId ? "bg-red-100" : ""
      }`}
    >
      {/* Avatar or Initials */}
      <div className="w-12 h-12 relative bg-red-400 rounded-full flex items-center justify-center">
        <div className="text-white font-bold text-xl">
          {onlinePeople ? onlinePeople.toUpperCase() : ""}
        </div>
        {online ? (
          <div className="absolute w-6 h-6 bottom-0 bg-green-500 right-0 rounded-full border border-white"></div>
        ) : (
          <div className="absolute w-3 h-3 bg-gray-400 bottom-0 right-0 rounded-full border border-white"></div>
        )}
      </div>

      {/* Username */}
      <div className="text-sm ml-3">
        {username.charAt(0).toUpperCase() + username.slice(1)}
      </div>
    </div>
  );
};

export default PersoList;
