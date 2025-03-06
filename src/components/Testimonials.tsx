const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Emma Johnson',
      role: 'CEO, TechVision',
      quote: 'Studio Clay transformed our brand identity with their creative vision. Their work has significantly improved our market presence and customer engagement.',
      avatar: '/avatars/avatar-1.jpg',
    },
    {
      id: 2,
      name: 'Marcus Peterson',
      role: 'Marketing Director, Eco Brands',
      quote: 'Working with Studio Clay was a game-changer for our company. Their attention to detail and innovative approach to design exceeded our expectations.',
      avatar: '/avatars/avatar-2.jpg',
    },
    {
      id: 3,
      name: 'Sophia Chen',
      role: 'Founder, Artisan Collective',
      quote: 'Studio Clay helped us create a cohesive brand identity that perfectly captures our values. Their team was professional, responsive, and a joy to work with.',
      avatar: '/avatars/avatar-3.jpg',
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Clients Say</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We take pride in delivering exceptional results and building lasting relationships with our clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col"
            >
              <div className="mb-6">
                <svg width="45" height="36" className="text-primary" viewBox="0 0 45 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 0C6.05625 0 0 6.05625 0 13.5C0 20.9437 6.05625 27 13.5 27C20.9437 27 27 20.9437 27 13.5C27 6.05625 20.9437 0 13.5 0ZM37.125 0L34.875 6.75H39.375C39.375 10.125 36.6187 13.5 32.625 13.5V20.25C40.0687 20.25 46.125 13.5 46.125 6.75V0H37.125Z" fill="currentColor" fillOpacity="0.2"/>
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic mb-6 flex-grow">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mr-4 flex items-center justify-center text-primary font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials; 