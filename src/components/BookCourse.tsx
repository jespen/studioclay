// 'use client';

// import React from 'react';
// import PageContainer from '@/components/common/PageContainer';
// import { Typography, Box, Grid, Paper } from '@mui/material';
// import Courses from '@/components/Courses';

// const BookCourse = () => {
//   return (
//     <>
//       <PageContainer centerContent paddingTop={6}>
//         <Typography variant="h3" component="h1" gutterBottom>
//           Boka din drejningskurs test
//         </Typography>
        
//         <Typography variant="subtitle1" color="text.secondary" paragraph sx={{ maxWidth: 800, mb: 6 }}>
//           Upptäck våra kurser i keramik och hantverk, designade för alla färdighetsnivåer. 
//           Välj mellan prova-på-kurser, intensiva helgkurser, och regelbundna sessioner för att 
//           utveckla din kreativitet och tekniska färdigheter.
//         </Typography>
        
//         <Box sx={{ width: '100%', mb: 6 }}>
//           <Courses />
//         </Box>
        
//         <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 6 }}>
//           Bokningsinformation
//         </Typography>
//       </PageContainer>
      
//       <Box sx={{ py: 6, backgroundColor: 'background.paper' }}>
//         <PageContainer>
//           <Grid container spacing={3}>
//             <Grid item xs={12} sm={6} md={3}>
//               <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Betalning
//                 </Typography>
//                 <Typography variant="body2">
//                   Betalning sker vid bokning via Swish eller faktura.
//                 </Typography>
//               </Paper>
//             </Grid>
            
//             <Grid item xs={12} sm={6} md={3}>
//               <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Avbokning
//                 </Typography>
//                 <Typography variant="body2">
//                   Avbokning kan göras upp till 7 dagar före kursstart med full återbetalning.
//                 </Typography>
//               </Paper>
//             </Grid>
            
//             <Grid item xs={12} sm={6} md={3}>
//               <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Material
//                 </Typography>
//                 <Typography variant="body2">
//                   Alla nödvändiga material och verktyg ingår i kursavgiften.
//                 </Typography>
//               </Paper>
//             </Grid>
            
//             <Grid item xs={12} sm={6} md={3}>
//               <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Plats
//                 </Typography>
//                 <Typography variant="body2">
//                   Alla kurser hålls i vår studio på Vasagatan 15 i Göteborg.
//                 </Typography>
//               </Paper>
//             </Grid>
//           </Grid>
//         </PageContainer>
//       </Box>
      
//       <PageContainer centerContent paddingTop={6} paddingBottom={8}>
//         <Typography variant="h4" component="h2" gutterBottom>
//           Företagsevent & Privata Kurser
//         </Typography>
        
//         <Typography variant="body1" sx={{ maxWidth: 700, mb: 4 }}>
//           Vi erbjuder skräddarsydda kurser för företagsevent, teambuilding eller 
//           privata grupper. Kontakta oss för mer information om våra specialpaket.
//         </Typography>
        
//         <Box sx={{ mt: 2 }}>
//           <a href="/contact" style={{ textDecoration: 'none' }}>
//             <button 
//               style={{ 
//                 padding: '12px 24px', 
//                 backgroundColor: '#2e7d32', 
//                 color: 'white', 
//                 border: 'none', 
//                 borderRadius: '8px',
//                 fontSize: '16px',
//                 fontWeight: '600',
//                 cursor: 'pointer',
//                 boxShadow: '0px 3px 5px rgba(0,0,0,0.2)'
//               }}
//             >
//               Kontakta oss
//             </button>
//           </a>
//         </Box>
//       </PageContainer>
//     </>
//   );
// };

// export default BookCourse; 