import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const StarRating = ({ rating }) => {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<FaStar key={i} className="text-yellow-400" />);
    } else if (rating >= i - 0.5) {
      stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
    } else {
      stars.push(<FaRegStar key={i} className="text-yellow-400" />);
    }
  }

return (
    <div className="flex items-center gap-1 justify-center mt-2 mb-2">
      {stars}
      <span className="text-sm max-sm:text-xs text-gray-700 font-medium ml-1">{(rating ?? 0).toFixed(1)}</span>
    </div>
  );
  
};

export default StarRating;