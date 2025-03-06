'use client';

import { useState } from 'react';
import styles from '@/styles/BookCourse.module.css';

interface Course {
  id: number;
  title: string;
  level: string;
  description: string;
  duration: string;
  schedule: string;
  capacity: string;
  price: string;
}

const BookCourse = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    course: '',
    participants: '1',
    message: '',
  });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const courses: Course[] = [
    {
      id: 1,
      title: 'Introduction to Clay Working',
      level: 'Beginner',
      description: 'Perfect for newcomers to clay. Learn the basic techniques and create your first pottery pieces.',
      duration: '4 weeks',
      schedule: 'Mondays, 6-8 PM',
      capacity: '12 people',
      price: '$350',
    },
    {
      id: 2,
      title: 'Wheel Throwing Techniques',
      level: 'Intermediate',
      description: 'Develop your wheel throwing skills and create vessels of various shapes and sizes.',
      duration: '6 weeks',
      schedule: 'Wednesdays, 6-9 PM',
      capacity: '10 people',
      price: '$450',
    },
    {
      id: 3,
      title: 'Clay Sculpture Workshop',
      level: 'All Levels',
      description: 'Explore sculptural techniques and create figurative or abstract pieces in clay.',
      duration: '2 days',
      schedule: 'Weekend Workshop, 10 AM-4 PM',
      capacity: '8 people',
      price: '$275',
    },
    {
      id: 4,
      title: 'Glaze Chemistry & Application',
      level: 'Advanced',
      description: 'Learn about glaze formulation, testing, and advanced application techniques.',
      duration: '5 weeks',
      schedule: 'Thursdays, 6-8:30 PM',
      capacity: '8 people',
      price: '$425',
    },
    {
      id: 5,
      title: 'Handbuilding Masterclass',
      level: 'Intermediate',
      description: 'Focus on coil, slab, and pinch techniques to create functional and decorative pieces.',
      duration: '6 weeks',
      schedule: 'Tuesdays, 6-8:30 PM',
      capacity: '10 people',
      price: '$400',
    },
    {
      id: 6,
      title: 'Kids Clay Camp',
      level: 'Children (8-12)',
      description: 'A fun introduction to clay for children. Create animals, containers, and more.',
      duration: '1 week',
      schedule: 'Summer M-F, 9 AM-12 PM',
      capacity: '15 children',
      price: '$250',
    },
  ];

  const faqs = [
    {
      question: 'What should I wear to a clay class?',
      answer: 'Wear comfortable clothes that you don\'t mind getting clay on. Many people prefer to wear an apron or smock. Avoid loose-fitting sleeves that might drag in clay or water. Bring a towel and consider having a clean change of shoes if you want to keep your regular shoes clay-free.',
    },
    {
      question: 'Do I need to bring my own tools?',
      answer: 'All basic tools and materials are provided for beginners. For intermediate and advanced classes, we provide a list of recommended tools that you may want to purchase. Many students develop preferences for specific tools as they progress.',
    },
    {
      question: 'How many pieces will I make in a class?',
      answer: 'This varies by course level and type. In beginner courses, students typically complete 3-5 finished pieces. More advanced classes might focus on fewer, more complex pieces or more pieces depending on the techniques being taught.',
    },
    {
      question: 'Is there an age requirement for your courses?',
      answer: 'Adult classes are for ages 16 and up. We offer specific classes for children ages 8-15, and family classes where parents and children can work together. Please check the specific course descriptions for age recommendations.',
    },
    {
      question: 'When do I get my finished pieces?',
      answer: 'Pottery requires time for drying, bisque firing, glazing, and final firing. This process typically takes 3-4 weeks after your last class. We\'ll notify you when your pieces are ready for pickup.',
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Booking request submitted successfully!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        course: '',
        participants: '1',
        message: '',
      });
    }, 1500);
  };

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormData((prev) => ({ ...prev, course: course.title }));
    window.scrollTo({
      top: document.getElementById('booking-form')?.offsetTop || 0,
      behavior: 'smooth'
    });
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            Book a <span className={styles.highlightText}>Clay Course</span>
          </h1>
          <p className={styles.description}>
            Join one of our hands-on clay courses and learn pottery techniques from experienced instructors in a creative and supportive environment.
          </p>
        </div>

        <div className={styles.coursesGrid}>
          {courses.map((course) => (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.cardImage}></div>
              <div className={styles.cardContent}>
                <span className={styles.courseLevel}>{course.level}</span>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <p className={styles.courseDesc}>{course.description}</p>
                <div className={styles.courseDetails}>
                  <span className={styles.detailItem}>
                    <svg className={styles.detailIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {course.duration}
                  </span>
                  <span className={styles.detailItem}>
                    <svg className={styles.detailIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {course.schedule}
                  </span>
                  <span className={styles.detailItem}>
                    <svg className={styles.detailIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {course.capacity}
                  </span>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{course.price}</span>
                  <button className={styles.bookButton} onClick={() => selectCourse(course)}>
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div id="booking-form" className={styles.formSection}>
          <div className={styles.formGrid}>
            <div>
              <h2 className={styles.formTitle}>Book Your Clay Course</h2>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="Your full name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="phone" className={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="course" className={styles.label}>Select Course</label>
                  <select
                    id="course"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    required
                    className={styles.select}
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.title}>
                        {course.title} ({course.level})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="participants" className={styles.label}>Number of Participants</label>
                  <select
                    id="participants"
                    name="participants"
                    value={formData.participants}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num.toString()}>
                        {num} {num === 1 ? 'person' : 'people'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>Additional Information</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className={styles.textarea}
                    placeholder="Let us know if you have any questions or special requirements..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Book Course'}
                </button>
              </form>
            </div>
            <div>
              <div className={styles.infoCard}>
                <h3 className={styles.infoTitle}>Course Information</h3>
                <ul className={styles.infoList}>
                  <li className={styles.infoItem}>
                    <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={styles.infoText}>
                      All materials and tools are provided with your course fee.
                    </span>
                  </li>
                  <li className={styles.infoItem}>
                    <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={styles.infoText}>
                      Classes start promptly at the scheduled time. Please arrive 15 minutes early.
                    </span>
                  </li>
                  <li className={styles.infoItem}>
                    <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className={styles.infoText}>
                      A 50% deposit is required to secure your booking.
                    </span>
                  </li>
                  <li className={styles.infoItem}>
                    <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className={styles.infoText}>
                      Wear comfortable clothes that you don&apos;t mind getting dirty.
                    </span>
                  </li>
                </ul>
                <h3 className={styles.infoTitle}>Cancellation Policy</h3>
                <p className={styles.infoText}>
                  Full refund if cancelled at least 7 days before the start date. 50% refund if cancelled 3-6 days before. No refunds for cancellations less than 3 days before the course starts.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.faqSection}>
          <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <div 
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(index)}
                >
                  {faq.question}
                  <svg 
                    className={styles.faqIcon} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    width="20" 
                    height="20"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={openFaqIndex === index ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
                    />
                  </svg>
                </div>
                {openFaqIndex === index && (
                  <div className={styles.faqAnswer}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCourse; 