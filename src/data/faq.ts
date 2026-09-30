/**
 * FAQ Data for DezenFoods
 *
 * Common questions about ordering, paying (escrow), delivery and selling food.
 */

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    question: "What is DezenFoods?",
    answer: "DezenFoods is the food service of the DezenMart ecosystem. Order snacks, small chops, groceries, pepper soup, rice meals and more from trusted vendors. Your payment is held in escrow until your food arrives, and you use the same DezenMart account you already have.",
    category: "Getting Started",
  },
  {
    question: "How do I place an order?",
    answer: "Browse a category or a vendor's menu, add items to your cart, choose delivery or pickup, and pay. Orders are from one vendor at a time because each vendor prepares and delivers their own order.",
    category: "Getting Started",
  },
  {
    question: "Do I need a DezenMart account?",
    answer: "You can browse without one. To order you sign in with Google. If you already use DezenMart, sign in the same way and you'll have the same account here.",
    category: "Getting Started",
  },

  // Payments
  {
    question: "How can I pay?",
    answer: "Pay by card or bank transfer through Korapay, pay through Pandascrow escrow, or pay with a crypto wallet where the vendor accepts it. You choose at checkout. Which options you see depends on what the vendor accepts.",
    category: "Payments",
  },
  {
    question: "Are there fees?",
    answer: "You see the full total - food, delivery and any service fee - before you pay. There are no hidden charges added afterwards.",
    category: "Payments",
  },
  {
    question: "My payment went through but my order still says awaiting payment.",
    answer: "Confirmation comes from the payment provider and normally takes seconds. Keep the order page open for a couple of minutes. If it doesn't update, contact support with your order number; your money is safe and will be applied or refunded.",
    category: "Payments",
  },
  {
    question: "Can I get a refund?",
    answer: "If the vendor declines your order, or you cancel before they accept it, you are refunded automatically. If something is wrong with your delivery, report a problem from the order page and our team will review it.",
    category: "Payments",
  },

  // Security & Escrow
  {
    question: "How does escrow protection work?",
    answer: "Your payment is held safely and is only released to the vendor after your order is delivered and you confirm you received it. If there's a problem you can raise a dispute and the money stays held while we review.",
    category: "Security",
  },
  {
    question: "When should I confirm delivery?",
    answer: "Only once you have your food and it's correct. Confirming releases the payment to the vendor and can't be undone. Some payments ask for a one-time code to confirm it's really you.",
    category: "Security",
  },
  {
    question: "Is it safe to pay a vendor directly?",
    answer: "No. Always pay through DezenFoods so you're protected. Anyone asking you to pay outside the app, or to move the conversation to WhatsApp to agree a different price, may be trying to bypass your protection.",
    category: "Security",
  },

  // Delivery
  {
    question: "How does delivery work?",
    answer: "After you pay, the vendor accepts and prepares your order, then a delivery rider collects it. You'll get notifications at each step. Some vendors also offer pickup.",
    category: "Delivery",
  },
  {
    question: "How long will my food take?",
    answer: "Each item shows a preparation time. Delivery time depends on the rider and distance. Some items need advance notice or have an order cut-off time, which is shown on the item.",
    category: "Delivery",
  },
  {
    question: "What about allergies?",
    answer: "Vendors list common allergens on each item, but kitchens can't guarantee an allergen-free environment. If you have a serious allergy, message the vendor before ordering.",
    category: "Delivery",
  },

  // Selling
  {
    question: "How do I sell on DezenFoods?",
    answer: "Go to Account, then Sell, and apply as a vendor with your business details and payout bank account. We review applications. Once approved you can list items with clear descriptions, prices, quantities and preparation times.",
    category: "Selling",
  },
  {
    question: "When do I get paid?",
    answer: "After the buyer confirms delivery (or the confirmation window passes), the payment is released to your bank account.",
    category: "Selling",
  },
  {
    question: "What should my listing include?",
    answer: "Be specific: exactly what's in each portion or pack, sizes, flavours, price, how many you can make, preparation time, and any allergens. Clear listings get more orders and fewer disputes.",
    category: "Selling",
  },

  // Troubleshooting
  {
    question: "My order hasn't arrived.",
    answer: "Check the order page for its status. If it's late, message the vendor from the order page. If you still have no answer, report a problem and don't confirm delivery.",
    category: "Troubleshooting",
  },
  {
    question: "How do I contact support?",
    answer: "Use Account, then Help & Support, or email our support team. Include your order number so we can help faster.",
    category: "Troubleshooting",
  },
];

/**
 * Get FAQs by category
 */
export const getFAQsByCategory = (category: string): FAQItem[] => {
  return FAQ_DATA.filter(faq => faq.category === category);
};

/**
 * Get all unique categories
 */
export const getFAQCategories = (): string[] => {
  return Array.from(new Set(FAQ_DATA.map(faq => faq.category)));
};

/**
 * Search FAQs by keyword
 */
export const searchFAQs = (keyword: string): FAQItem[] => {
  const lowerKeyword = keyword.toLowerCase();
  return FAQ_DATA.filter(
    faq =>
      faq.question.toLowerCase().includes(lowerKeyword) ||
      faq.answer.toLowerCase().includes(lowerKeyword)
  );
};
