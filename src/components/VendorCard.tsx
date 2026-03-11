import Link from 'next/link';
import { MapPin, Star, Heart } from 'lucide-react';

interface VendorCardProps {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  startingPrice?: string;
  featured?: boolean;
}

export default function VendorCard({
  id,
  name,
  category,
  location,
  rating,
  reviewCount,
  imageUrl,
  startingPrice,
  featured = false,
}: VendorCardProps) {
  return (
    <Link href={`/vendors/${id}`} className="group block">
      <article className="card-elevated">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {featured && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-champagne-500 text-charcoal-900 text-caption font-semibold rounded-full">
              Featured
            </div>
          )}
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
            <Heart className="w-5 h-5 text-charcoal-700" />
          </button>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-serif text-heading-sm text-charcoal-900 mb-1 group-hover:text-rose-600 transition-colors">
                {name}
              </h3>
              <p className="text-body-sm text-charcoal-600">{category}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 mb-3">
            <Star className="w-4 h-4 text-champagne-600 fill-champagne-600" />
            <span className="text-body-sm font-medium text-charcoal-900">{rating}</span>
            <span className="text-body-sm text-charcoal-500">({reviewCount} avis)</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-charcoal-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-body-sm">{location}</span>
            </div>
            {startingPrice && (
              <span className="text-body-sm font-medium text-charcoal-900">
                Dès {startingPrice}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
