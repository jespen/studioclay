// /**
//  * VIKTIGT: DENNA KOMPONENT ANVÄNDS INTE I PRODUKTIONEN
//  * =================================================== 
//  * 
//  * Den här filen är inaktuell och används inte i det befintliga systemet.
//  * Bekräftelsesidan använder i stället följande komponentkedja:
//  * 
//  * 1. GiftCardConfirmationWrapper.tsx
//  * 2. GenericConfirmation.tsx
//  * 3. GiftCardConfirmationDetails.tsx
//  * 
//  * All PDF-genereringsfunktionalitet har implementerats i GiftCardConfirmationDetails.tsx.
//  * 
//  * Denna fil behålls endast för referens och historisk dokumentation.
//  */

// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { 
//   Box, 
//   Typography, 
//   Paper, 
//   Grid,
//   Alert, 
//   Divider,
//   Button,
// } from '@mui/material';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import EmailIcon from '@mui/icons-material/Email';
// import ReceiptIcon from '@mui/icons-material/Receipt';
// import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
// import FileDownloadIcon from '@mui/icons-material/FileDownload';
// import Link from 'next/link';

// import { FlowStateData } from '../common/FlowStepWrapper';
// import StyledButton from '../common/StyledButton';
// import { 
//   cleanupCheckoutFlow, 
//   getUserInfo, 
//   getPaymentInfo, 
//   getGiftCardDetails 
// } from '@/utils/dataStorage';

// // Define types
// interface GiftCardDetails {
//   amount: string;
//   type: string;
//   recipientName?: string;
//   recipientEmail?: string;
//   message?: string;
//   created_at?: string;
//   id?: string; // Gift card ID from database
//   code?: string; // Gift card code
// }

// interface UserInfo {
//   firstName: string;
//   lastName: string;
//   email: string;
//   phone: string;
//   specialRequirements?: string;
// }

// interface PaymentInfo {
//   status: string;
//   method?: string;
//   amount?: string;
//   payment_date?: string;
//   reference?: string;
// }

// interface GiftCardConfirmationProps {
//   flowData?: FlowStateData;
// }

// // Generate a random gift card number
// const generateGiftCardNumber = () => {
//   // Format: SC-XXXX-XXXX-XXXX
//   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//   let result = 'SC-';
//   for (let i = 0; i < 12; i++) {
//     if (i % 4 === 0 && i > 0) result += '-';
//     result += characters.charAt(Math.floor(Math.random() * characters.length));
//   }
//   return result;
// };

// // Format date to Swedish format
// const formatDate = (dateString: string) => {
//   const date = new Date(dateString);
//   return date.toLocaleDateString('sv-SE', {
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric'
//   });
// };

// // Add one year to date
// const addOneYear = (dateString: string) => {
//   const date = new Date(dateString);
//   date.setFullYear(date.getFullYear() + 1);
//   return formatDate(date.toISOString());
// };

// const GiftCardConfirmation: React.FC<GiftCardConfirmationProps> = ({ flowData }) => {
//   const router = useRouter();
//   const [giftCardDetails, setGiftCardDetails] = useState<GiftCardDetails | null>(null);
//   const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
//   const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
//   const [giftCardNumber] = useState(generateGiftCardNumber());
//   const [error, setError] = useState<string | null>(null);
//   const [giftCardId, setGiftCardId] = useState<string | null>(null);
//   const [generatingPdf, setGeneratingPdf] = useState(false);
//   const [pdfUrl, setPdfUrl] = useState<string | null>(null);

//   // Load data from props or flow storage
//   useEffect(() => {
//     console.log("CONFIRM-1: Component mounted, checking for flowData", !!flowData);
    
//     if (flowData) {
//       // Set data from flowData props
//       console.log("CONFIRM-2: Using flowData:", flowData);
//       console.log("CONFIRM-3: ItemDetails from flowData:", flowData.itemDetails);
      
//       setGiftCardDetails(flowData.itemDetails as GiftCardDetails);
//       setUserInfo(flowData.userInfo as UserInfo);
//       setPaymentInfo(flowData.paymentInfo as PaymentInfo);
      
//       if (flowData.itemDetails?.id) {
//         console.log("CONFIRM-4: Setting gift card ID from flowData:", flowData.itemDetails.id);
//         setGiftCardId(flowData.itemDetails.id as string);
//       } else {
//         console.log("CONFIRM-5: No gift card ID found in flowData.itemDetails");
//       }
//     } else {
//       // Fallback to flowStorage functions
//       try {
//         console.log("CONFIRM-6: No flowData, using flowStorage");
//         const storedUserInfo = getUserInfo<UserInfo>();
//         const storedGiftCardDetails = getGiftCardDetails<GiftCardDetails>();
//         const storedPaymentInfo = getPaymentInfo<PaymentInfo>();
        
//         console.log("CONFIRM-7: Stored gift card details:", storedGiftCardDetails);
        
//         if (storedUserInfo) setUserInfo(storedUserInfo);
//         if (storedGiftCardDetails) {
//           setGiftCardDetails(storedGiftCardDetails);
          
//           // Check both id and ID since case might vary
//           const cardId = storedGiftCardDetails.id;
//           if (cardId) {
//             console.log("CONFIRM-8: Setting gift card ID from storage:", cardId);
//             setGiftCardId(cardId as string);
//           } else {
//             console.log("CONFIRM-9: No gift card ID found in storage");
//             // Try to import and use flowStorage directly
//             import('@/utils/flowStorage').then(module => {
//               try {
//                 const allFlowData = module.getAllFlowData();
//                 console.log("CONFIRM-10: Checking getAllFlowData:", allFlowData);
                
//                 // Check for id in gift card details first
//                 if (allFlowData.giftCardDetails && typeof allFlowData.giftCardDetails === 'object') {
//                   const giftCardDetails = allFlowData.giftCardDetails as any;
//                   if (giftCardDetails.id) {
//                     console.log("CONFIRM-11: Found ID in giftCardDetails:", giftCardDetails.id);
//                     setGiftCardId(giftCardDetails.id);
//                     return;
//                   }
//                 }
                
//                 // Then check in item details
//                 if (allFlowData.itemDetails && typeof allFlowData.itemDetails === 'object') {
//                   const itemDetails = allFlowData.itemDetails as any;
//                   if (itemDetails.id) {
//                     console.log("CONFIRM-12: Found ID in itemDetails:", itemDetails.id);
//                     setGiftCardId(itemDetails.id);
//                   }
//                 }
//               } catch (err) {
//                 console.error("CONFIRM-ERROR-1: Error accessing flow data:", err);
//               }
//             });
//           }
//         }
//         if (storedPaymentInfo) setPaymentInfo(storedPaymentInfo);
//       } catch (error) {
//         console.error('CONFIRM-ERROR-2: Error loading stored data:', error);
//         setError('Ett fel uppstod vid laddning av orderinformation.');
//       }
//     }
//   }, [flowData]);

//   // Add a second useEffect to log whenever giftCardId changes
//   useEffect(() => {
//     console.log("CONFIRM-13: Gift card ID state updated:", giftCardId);
//   }, [giftCardId]);

//   const handleHome = () => {
//     // Clear all flow data before going home
//     cleanupCheckoutFlow();
//   };

//   const handleGeneratePdf = async () => {
//     console.log("CONFIRM-14: Generate PDF button clicked");
//     console.log("CONFIRM-15: Current gift card ID state:", giftCardId);
//     console.log("CONFIRM-16: Direct localStorage check:", localStorage.getItem('giftCardId'));
    
//     // Check all localStorage keys related to gift cards
//     const localStorageKeys = Object.keys(localStorage);
//     console.log("CONFIRM-17: All localStorage keys:", localStorageKeys);
    
//     // Check for any keys containing "id" or "ID"
//     const idKeys = localStorageKeys.filter(key => key.toLowerCase().includes('id'));
//     console.log("CONFIRM-18: localStorage keys containing 'id':", idKeys);
//     for (const key of idKeys) {
//       console.log(`CONFIRM-19: ${key}:`, localStorage.getItem(key));
//     }
    
//     // Try the fallback ID from direct localStorage as a last resort
//     const fallbackId = localStorage.getItem('giftCardId');
//     const idToUse = giftCardId || fallbackId;
    
//     if (!idToUse) {
//       console.error("CONFIRM-ERROR-3: Cannot generate PDF: Missing gift card ID");
//       setError('Kunde inte generera PDF: Saknar presentkorts-ID');
      
//       // Last resort: try to get the gift card ID again from various sources
//       try {
//         const { getAllFlowData, getGiftCardDetails } = await import('@/utils/flowStorage');
//         const allFlowData = getAllFlowData();
//         const details = getGiftCardDetails();
//         console.log("CONFIRM-20: Emergency check - allFlowData:", allFlowData);
//         console.log("CONFIRM-21: Emergency check - giftCardDetails:", details);
        
//         // Try all possible locations for gift card ID
//         let emergencyId = null;
        
//         // First check gift card details
//         if (details && typeof details === 'object') {
//           const giftCardDetails = details as any;
//           if (giftCardDetails.id) {
//             emergencyId = giftCardDetails.id;
//             console.log("CONFIRM-22: Found ID in giftCardDetails:", emergencyId);
//           }
//         }
        
//         // Then check item details
//         if (!emergencyId && allFlowData.itemDetails && typeof allFlowData.itemDetails === 'object') {
//           const itemDetails = allFlowData.itemDetails as any;
//           if (itemDetails.id) {
//             emergencyId = itemDetails.id;
//             console.log("CONFIRM-23: Found ID in itemDetails:", emergencyId);
//           }
//         }
        
//         if (emergencyId) {
//           console.log("CONFIRM-24: Setting emergency ID:", emergencyId);
//           setGiftCardId(emergencyId);
//           // Try to proceed with the emergency ID
//           // Continue with PDF generation using the emergency ID
//           return handleGeneratePdfWithId(emergencyId);
//         }
//       } catch (e) {
//         console.error("CONFIRM-ERROR-4: Emergency check failed:", e);
//       }
//       return;
//     }

//     return handleGeneratePdfWithId(idToUse);
//   };

//   const handleGeneratePdfWithId = async (id: string) => {
//     console.log("CONFIRM-25: Generating PDF with ID:", id);
//     setGeneratingPdf(true);
    
//     try {
//       console.log("CONFIRM-26: Calling API to generate PDF for ID:", id);
//       const response = await fetch('/api/gift-card/generate-pdf', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ id }),
//       });

//       console.log("CONFIRM-27: API response status:", response.status);
//       const data = await response.json();
//       console.log("CONFIRM-28: API response data:", data);
      
//       if (!response.ok || !data.success) {
//         throw new Error(data.error || 'Något gick fel vid generering av PDF');
//       }

//       setPdfUrl(data.pdfUrl);
//       console.log("CONFIRM-29: PDF URL set:", data.pdfUrl);
      
//       // Open PDF in new tab
//       const pdfWindow = window.open('', '_blank');
//       if (pdfWindow) {
//         console.log("CONFIRM-30: Opening PDF in new window");
//         pdfWindow.document.write(`
//           <html>
//             <head>
//               <title>Presentkort - Studio Clay</title>
//             </head>
//             <body style="margin:0;padding:0;">
//               <iframe 
//                 src="data:application/pdf;base64,${data.pdf}" 
//                 width="100%" 
//                 height="100%" 
//                 style="border:none;position:absolute;top:0;left:0;right:0;bottom:0;"
//               ></iframe>
//             </body>
//           </html>
//         `);
//       } else {
//         console.warn("CONFIRM-WARNING-1: Could not open PDF window, possibly blocked by browser");
//       }
//     } catch (error) {
//       console.error('CONFIRM-ERROR-5: Error generating PDF:', error);
//       setError(`Kunde inte generera PDF: ${error instanceof Error ? error.message : 'Okänt fel'}`);
//     } finally {
//       setGeneratingPdf(false);
//     }
//   };

//   const purchaseDate = paymentInfo?.payment_date 
//     ? formatDate(paymentInfo.payment_date)
//     : formatDate(new Date().toISOString());
    
//   const expiryDate = paymentInfo?.payment_date
//     ? addOneYear(paymentInfo.payment_date)
//     : addOneYear(new Date().toISOString());

//   // Log render phase to see if PDF button section will be rendered
//   console.log("CONFIRM-31: Rendering component with giftCardId:", giftCardId);

//   return (
//     <Paper elevation={3} sx={{ borderRadius: 2, p: { xs: 2, sm: 4 }, mt: 4 }}>
//       {error ? (
//         <Alert severity="error" sx={{ mb: 3 }}>
//           {error}
//         </Alert>
//       ) : (
//         <Box sx={{ textAlign: 'center', mb: 4 }}>
//           <CheckCircleIcon 
//             sx={{ 
//               fontSize: 80, 
//               color: 'var(--primary)', 
//               mb: 2 
//             }} 
//           />
//           <Typography variant="h4" gutterBottom>
//             Din beställning är bekräftad
//           </Typography>
//           <Typography variant="body1" color="text.secondary">
//             En orderbekräftelse har skickats till {userInfo?.email || 'din e-post'}.
//           </Typography>
//         </Box>
//       )}
      
//       {/* Gift Card Details */}
//       <Box 
//         sx={{ 
//           mb: 4, 
//           p: 3, 
//           border: '1px solid #e0e0e0', 
//           borderRadius: 2,
//           background: '#f9f9f9'
//         }}
//       >
//         <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
//           <CardGiftcardIcon sx={{ mr: 1, color: 'var(--primary)' }} />
//           <Typography variant="h6">Presentkort</Typography>
//         </Box>
        
//         <Grid container spacing={2} sx={{ mb: 2 }}>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Presentkortsnummer</Typography>
//             <Typography variant="body1" fontWeight="bold">
//               {giftCardDetails?.code || giftCardNumber}
//             </Typography>
//           </Grid>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Belopp</Typography>
//             <Typography variant="body1" fontWeight="bold">{giftCardDetails?.amount || '0'} kr</Typography>
//           </Grid>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Köpdatum</Typography>
//             <Typography variant="body1">{purchaseDate}</Typography>
//           </Grid>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Giltigt till</Typography>
//             <Typography variant="body1">{expiryDate}</Typography>
//           </Grid>
//         </Grid>
        
//         <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
//           <Typography variant="body2">
//             Presentkortet har skickats till {giftCardDetails?.recipientEmail || 'mottagaren'} och kan användas för att boka 
//             kurser, workshops eller köpa produkter på vår hemsida.
//           </Typography>
//         </Box>
        
//         {/* PDF Download Button */}
//         <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
//           <Button
//             variant="outlined"
//             startIcon={<FileDownloadIcon />}
//             onClick={handleGeneratePdf}
//             disabled={generatingPdf || !giftCardId}
//             sx={{ 
//               borderColor: 'var(--primary)', 
//               color: 'var(--primary)',
//               '&:hover': {
//                 borderColor: 'var(--primary-dark)',
//                 backgroundColor: 'rgba(84, 114, 100, 0.05)'
//               }
//             }}
//           >
//             {generatingPdf ? 'Genererar PDF...' : 'Visa och ladda ner presentkort'}
//           </Button>
//         </Box>
//         {/* Debug info to show if the button should be enabled */}
//         <Box sx={{ mt: 1, textAlign: 'center' }}>
//           <Typography variant="caption" color="text.secondary">
//             {giftCardId ? 'Presentkorts-ID: ' + giftCardId : 'Inget presentkorts-ID hittat'}
//           </Typography>
//         </Box>
//       </Box>
      
//       {/* Recipient Information */}
//       {giftCardDetails && (giftCardDetails.recipientName || giftCardDetails.recipientEmail) && (
//         <Box sx={{ mb: 4 }}>
//           <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
//             <EmailIcon sx={{ mr: 1, color: 'var(--primary)' }} />
//             <Typography variant="h6">Mottagarinformation</Typography>
//           </Box>
          
//           <Grid container spacing={2}>
//             <Grid item xs={12} sm={6}>
//               <Typography variant="body2" color="text.secondary">Avsändare</Typography>
//               <Typography variant="body1">{userInfo?.firstName} {userInfo?.lastName}</Typography>
//               <Typography variant="body1">{userInfo?.email}</Typography>
//             </Grid>
            
//             <Grid item xs={12} sm={6}>
//               <Typography variant="body2" color="text.secondary">Mottagare</Typography>
//               <Typography variant="body1">{giftCardDetails.recipientName || 'Ej angiven'}</Typography>
//               <Typography variant="body1">{giftCardDetails.recipientEmail || 'Ej angiven'}</Typography>
//             </Grid>
            
//             {giftCardDetails.message && (
//               <Grid item xs={12} sx={{ mt: 2 }}>
//                 <Typography variant="body2" color="text.secondary">Personligt meddelande</Typography>
//                 <Typography variant="body1" sx={{ fontStyle: 'italic', p: 2, bgcolor: 'rgba(84, 114, 100, 0.05)', borderRadius: 1 }}>
//                   "{giftCardDetails.message}"
//                 </Typography>
//               </Grid>
//             )}
//           </Grid>
//         </Box>
//       )}
      
//       {/* Order Information */}
//       <Box sx={{ mb: 4 }}>
//         <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
//           <ReceiptIcon sx={{ mr: 1, color: 'var(--primary)' }} />
//           <Typography variant="h6">Orderinformation</Typography>
//         </Box>
        
//         <Grid container spacing={2}>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Ordernummer</Typography>
//             <Typography variant="body1">{paymentInfo?.reference || Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}</Typography>
//           </Grid>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Betalningssätt</Typography>
//             <Typography variant="body1">{paymentInfo?.method === 'card' ? 'Kortbetalning' : (paymentInfo?.method === 'swish' ? 'Swish' : 'Faktura')}</Typography>
//           </Grid>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Totalt</Typography>
//             <Typography variant="body1">{giftCardDetails?.amount || paymentInfo?.amount || '0'} kr</Typography>
//           </Grid>
//           <Grid item xs={12} sm={6}>
//             <Typography variant="body2" color="text.secondary">Status</Typography>
//             <Typography variant="body1" sx={{ 
//               fontWeight: 'bold',
//               color: paymentInfo?.status === 'PAID' ? 'green' : 'orange'
//             }}>
//               {paymentInfo?.status === 'PAID' ? 'Genomförd' : 'Ej betald'}
//             </Typography>
//           </Grid>
//         </Grid>
//       </Box>
      
//       {/* Buttons */}
//       <Box sx={{ mt: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between' }}>
//         <Link href="/courses" passHref style={{ textDecoration: 'none', marginBottom: { xs: '1rem', sm: 0 } as any }}>
//           <StyledButton secondary onClick={handleHome}>
//             Utforska våra kurser
//           </StyledButton>
//         </Link>
        
//         <Link href="/" passHref style={{ textDecoration: 'none' }}>
//           <StyledButton onClick={handleHome}>
//             Tillbaka till startsidan
//           </StyledButton>
//         </Link>
//       </Box>
//     </Paper>
//   );
// };

// export default GiftCardConfirmation; 