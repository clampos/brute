// server/utils/referralUtils.ts
export function generateReferralCode(firstName: string, surname: string): string {
  // Clean and capitalize names
  const cleanFirstName = firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
  const cleanSurname = surname.trim().charAt(0).toUpperCase() + surname.trim().slice(1).toLowerCase();
  
  // Create the base code: FirstNameLastNameFriend
  const baseCode = `${cleanFirstName}${cleanSurname}Friend`;
  
  // Add a random suffix to ensure uniqueness (2 characters)
  const chars = '0123456789';
  let suffix = '';
  for (let i = 0; i < 2; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${baseCode}${suffix}`;
}

// Helper function to check if referral code is unique
export async function generateUniqueReferralCode(firstName: string, surname: string, prisma: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateReferralCode(firstName, surname);
    
    // Check if code already exists
    const existingUser = await prisma.user.findUnique({
      where: { referralCode: code }
    });
    
    if (!existingUser) {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback: if we can't generate unique code, add timestamp
  const timestamp = Date.now().toString().slice(-4);
  return `${firstName}${surname}Friend${timestamp}`;
}