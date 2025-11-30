import { CreatineReportProps } from "@/components/templates/CreatineReportTemplate";

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

const templateStyles = `
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* Brand Bar */
.brandBar {
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 0;
}

.brandContent {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brandLogo {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  background-color: #f0f0f0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.brandText {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* Dark Nav Bar */
.navBar {
  background-color: #2c2c2c;
  padding: 0;
}

.navContent {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  gap: 32px;
}

.navLink {
  color: #ffffff;
  text-decoration: none;
  padding: 16px 0;
  font-size: 14px;
  transition: color 0.2s;
}

.navLink:hover {
  color: #cccccc;
}

/* Main Content */
.mainContent {
  padding: 40px 20px;
}

.contentWrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 32px;
}

@media (max-width: 968px) {
  .contentWrapper {
    grid-template-columns: 1fr;
  }
}

/* Left Column */
.leftColumn {
  min-width: 0;
}

.contentCard {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.breadcrumb {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.pageTitle {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.updatedTag {
  font-size: 12px;
  color: #888;
  margin-bottom: 24px;
}

/* Review Panel */
.reviewPanel {
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 32px;
}

.reviewHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.reviewTitle {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.overallRating {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.ratingValue {
  font-size: 28px;
  font-weight: bold;
  color: #d32f2f;
}

.ratingStars {
  font-size: 18px;
  color: #ffa000;
}

.stars {
  color: #ffa000;
  font-size: 16px;
  letter-spacing: 2px;
}

.ratingGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.ratingItem {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ratingLabel {
  font-size: 14px;
  color: #666;
}

.ratingScore {
  font-size: 14px;
}

.productImage {
  margin-bottom: 20px;
}

.imagePlaceholder {
  width: 100%;
  height: 200px;
  background-color: #e0e0e0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.ctaButton {
  display: block;
  width: 100%;
  padding: 14px;
  background-color: #d32f2f;
  color: #ffffff;
  text-align: center;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: background-color 0.2s;
}

.ctaButton:hover {
  background-color: #b71c1c;
}

/* Main Lead */
.mainLead {
  font-size: 18px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 32px;
  font-weight: 500;
}

/* Sections */
.section {
  margin-bottom: 32px;
}

.sectionTitle {
  font-size: 24px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0 0 16px 0;
}

.paragraph {
  font-size: 16px;
  line-height: 1.7;
  color: #444;
  margin-bottom: 16px;
}

.benefitsList {
  list-style: disc;
  padding-left: 24px;
  margin: 0;
}

.benefitsList li {
  font-size: 16px;
  line-height: 1.7;
  color: #444;
  margin-bottom: 12px;
}

/* Right Column - Sidebar */
.rightColumn {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebarBox {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sidebarTitle {
  font-size: 20px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0 0 16px 0;
}

.sidebarList {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.sidebarList li {
  font-size: 14px;
  line-height: 1.6;
  color: #444;
  margin-bottom: 10px;
}

/* Newsletter Box */
.newsletterBox {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.newsletterTitle {
  font-size: 20px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0 0 12px 0;
}

.newsletterDesc {
  font-size: 14px;
  line-height: 1.6;
  color: #666;
  margin-bottom: 16px;
}

.newsletterForm {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.newsletterInput {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.newsletterInput:focus {
  outline: none;
  border-color: #d32f2f;
}

.newsletterButton {
  padding: 12px;
  background-color: #d32f2f;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.newsletterButton:hover {
  background-color: #b71c1c;
}
`;

export function buildCreatineReportHtml(props: CreatineReportProps): string {
  const stars = renderStars(props.ratings.overallRating);
  const customerServiceStars = renderStars(props.ratings.customerService);
  const valueStars = renderStars(props.ratings.valueRating);
  const customerStars = renderStars(props.ratings.customerRating);

  const benefitsHtml = props.mainBenefits.length > 0
    ? `<ul class="benefitsList">
        ${props.mainBenefits.map(benefit => `<li>${escapeHtml(benefit)}</li>`).join('')}
      </ul>`
    : '';

  const effectivenessHtml = props.effectivenessParagraphs.length > 0
    ? `<section class="section">
        <h2 class="sectionTitle">Effectiveness</h2>
        ${props.effectivenessParagraphs.map(p => `<p class="paragraph">${escapeHtml(p)}</p>`).join('')}
      </section>`
    : '';

  const comparisonHtml = props.comparisonParagraphs.length > 0
    ? `<section class="section">
        <h2 class="sectionTitle">Comparison</h2>
        ${props.comparisonParagraphs.map(p => `<p class="paragraph">${escapeHtml(p)}</p>`).join('')}
      </section>`
    : '';

  const reviewsHtml = props.reviewParagraphs.length > 0
    ? `<section class="section">
        <h2 class="sectionTitle">Reviews</h2>
        ${props.reviewParagraphs.map(p => `<p class="paragraph">${escapeHtml(p)}</p>`).join('')}
      </section>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(props.pageTitle)}</title>
  <style>
    ${templateStyles}
  </style>
</head>
<body>
  <div class="container">
    <!-- Brand Bar -->
    <div class="brandBar">
      <div class="brandContent">
        <span class="brandLogo">CR</span>
        <span class="brandText">Creatine Report</span>
      </div>
    </div>

    <!-- Dark Nav Bar -->
    <nav class="navBar">
      <div class="navContent">
        <a href="#" class="navLink">Top Products</a>
        <a href="#" class="navLink">Creatine Information</a>
        <a href="#" class="navLink">Product Comparison</a>
        <a href="#" class="navLink">FAQ</a>
        <a href="#" class="navLink">Contact Us</a>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="mainContent">
      <div class="contentWrapper">
        <!-- Left Column - Review Panel & Content -->
        <div class="leftColumn">
          <div class="contentCard">
            <!-- Breadcrumb -->
            <div class="breadcrumb">${escapeHtml(props.breadcrumb)}</div>

            <!-- Page Title -->
            <h1 class="pageTitle">${escapeHtml(props.pageTitle)}</h1>
            <div class="updatedTag">${escapeHtml(props.updatedTag)}</div>

            <!-- Review Panel -->
            <div class="reviewPanel">
              <div class="reviewHeader">
                <h2 class="reviewTitle">${escapeHtml(props.productName)}</h2>
                <div class="overallRating">
                  <div class="ratingValue">${props.ratings.overallRating.toFixed(1)}</div>
                  <div class="ratingStars">
                    <span class="stars">${stars}</span>
                  </div>
                </div>
              </div>
              <div class="ratingGrid">
                <div class="ratingItem">
                  <span class="ratingLabel">Customer Service</span>
                  <span class="ratingScore">
                    <span class="stars">${customerServiceStars}</span>
                  </span>
                </div>
                <div class="ratingItem">
                  <span class="ratingLabel">Value Rating</span>
                  <span class="ratingScore">
                    <span class="stars">${valueStars}</span>
                  </span>
                </div>
                <div class="ratingItem">
                  <span class="ratingLabel">Customer Rating</span>
                  <span class="ratingScore">
                    <span class="stars">${customerStars}</span>
                  </span>
                </div>
              </div>
              <div class="productImage">
                <div class="imagePlaceholder">${escapeHtml(props.productImageAlt)}</div>
              </div>
              <a href="${escapeHtml(props.productUrl)}" class="ctaButton" target="_blank" rel="noopener noreferrer">
                View Product
              </a>
            </div>

            <!-- Main Lead -->
            <div class="mainLead">${escapeHtml(props.mainLead)}</div>

            <!-- Main Benefits -->
            ${benefitsHtml ? `<section class="section">
              <h2 class="sectionTitle">Main Benefits</h2>
              ${benefitsHtml}
            </section>` : ''}

            <!-- Effectiveness -->
            ${effectivenessHtml}

            <!-- Comparison -->
            ${comparisonHtml}

            <!-- Reviews -->
            ${reviewsHtml}

            <!-- Bottom Line -->
            <section class="section">
              <h2 class="sectionTitle">Bottom Line</h2>
              <p class="paragraph">${escapeHtml(props.bottomLineParagraph)}</p>
            </section>
          </div>
        </div>

        <!-- Right Column - Sidebar -->
        <div class="rightColumn">
          <!-- What You'll Discover -->
          <div class="sidebarBox">
            <h3 class="sidebarTitle">What You'll Discover</h3>
            <ul class="sidebarList">
              ${props.sidebarDiscoverItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>

          <!-- Top 6 Items to Consider -->
          <div class="sidebarBox">
            <h3 class="sidebarTitle">Top 6 Items to Consider</h3>
            <ul class="sidebarList">
              ${props.sidebarTopItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>

          <!-- Newsletter Box -->
          <div class="newsletterBox">
            <h3 class="newsletterTitle">${escapeHtml(props.newsletterTitle)}</h3>
            <p class="newsletterDesc">${escapeHtml(props.newsletterDesc)}</p>
            <form class="newsletterForm">
              <input type="email" placeholder="Enter your email" class="newsletterInput" />
              <button type="submit" class="newsletterButton">Subscribe</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

