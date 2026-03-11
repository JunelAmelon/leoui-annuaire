import { Star } from 'lucide-react';

interface TestimonialCardProps {
  name: string;
  role: string;
  content: string;
  rating: number;
  imageUrl: string;
  weddingDate: string;
}

export default function TestimonialCard({
  name,
  role,
  content,
  rating,
  imageUrl,
  weddingDate,
}: TestimonialCardProps) {
  return (
    <article className="bg-white rounded-2xl p-8 shadow-soft">
      <div className="flex items-center space-x-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < rating
                ? 'text-champagne-600 fill-champagne-600'
                : 'text-charcoal-200'
            }`}
          />
        ))}
      </div>

      <blockquote className="text-body-lg text-charcoal-800 mb-6 leading-relaxed">
        "{content}"
      </blockquote>

      <div className="flex items-center">
        <img
          src={imageUrl}
          alt={name}
          className="w-14 h-14 rounded-full object-cover mr-4"
        />
        <div>
          <p className="font-semibold text-charcoal-900">{name}</p>
          <p className="text-body-sm text-charcoal-600">{role}</p>
          <p className="text-caption text-charcoal-500 mt-1">{weddingDate}</p>
        </div>
      </div>
    </article>
  );
}
