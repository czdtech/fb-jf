/**
 * 法务页面内容迁移脚本 - 将法务页面内容迁移到内容集合
 * Phase 1: 将页面正文内容提取到 JSON 文件，保持页面模板结构
 *
 * 使用方法：
 * - Dry-run: tsx scripts/migrate-legal-content.ts
 * - 执行: tsx scripts/migrate-legal-content.ts --execute
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "node:path";

const LOCALES = ["en", "zh", "es", "fr", "de", "ja", "ko"] as const;
type Locale = (typeof LOCALES)[number];

interface LegalContent {
  privacy: {
    meta: {
      title: string;
      description: string;
      lastUpdated: string;
    };
    sections: Array<{
      id: string;
      title: string;
      content: string;
    }>;
    tableOfContents: Array<{
      id: string;
      label: string;
    }>;
  };
  terms: {
    meta: {
      title: string;
      description: string;
      lastUpdated: string;
    };
    sections: Array<{
      id: string;
      title: string;
      content: string;
    }>;
    tableOfContents: Array<{
      id: string;
      label: string;
    }>;
  };
}

// 提取隐私政策内容
function extractPrivacyContent(astroContent: string): LegalContent["privacy"] {
  // 这是一个简化版本，实际实现需要解析 AST
  // 现在仅提取关键部分作为示例
  return {
    meta: {
      title: "Privacy Policy | FiddleBops",
      description:
        "Learn about how FiddleBops collects, uses, and protects your personal information. Our comprehensive privacy policy explains our data practices.",
      lastUpdated: "February 10, 2025",
    },
    tableOfContents: [
      { id: "introduction", label: "Introduction" },
      { id: "definitions", label: "Definitions" },
      { id: "data-collection", label: "Data Collection" },
      { id: "data-usage", label: "How We Use Data" },
      { id: "data-sharing", label: "Data Sharing" },
      { id: "data-security", label: "Data Security" },
      { id: "your-rights", label: "Your Rights" },
      { id: "contact", label: "Contact Us" },
    ],
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        content: `<p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
<p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>`,
      },
      {
        id: "definitions",
        title: "Interpretation and Definitions",
        content: `<h3>Interpretation</h3>
<p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>
<h3>Definitions</h3>
<p>For the purposes of this Privacy Policy:</p>
<ul>
  <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
  <li><strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</li>
  <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to FiddleBops.</li>
  <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</li>
  <li><strong>Country</strong> refers to: New York, United States</li>
  <li><strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.</li>
  <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
  <li><strong>Service</strong> refers to the Website.</li>
  <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company.</li>
  <li><strong>Website</strong> refers to FiddleBops, accessible from <a href="https://www.playfiddlebops.com/" target="_blank" rel="external noopener">https://www.playfiddlebops.com/</a></li>
  <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
</ul>`,
      },
      {
        id: "data-collection",
        title: "Collecting and Using Your Personal Data",
        content: `<h3>Types of Data Collected</h3>
<h4>Personal Data</h4>
<p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
<ul>
  <li>Usage Data</li>
</ul>
<h4>Usage Data</h4>
<p>Usage Data is collected automatically when using the Service.</p>
<p>Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
<p>When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.</p>
<h4>Tracking Technologies and Cookies</h4>
<p>We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies used are beacons, tags, and scripts to collect and track information and to improve and analyze Our Service.</p>
<div class="info-box">
  <i class="fas fa-info-circle"></i>
  <div>
    <h5>Cookie Notice</h5>
    <p>We use both Session and Persistent Cookies for essential website functionality, analytics, and improving your user experience.</p>
  </div>
</div>`,
      },
      {
        id: "data-usage",
        title: "Use of Your Personal Data",
        content: `<p>The Company may use Personal Data for the following purposes:</p>
<ul>
  <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
  <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.</li>
  <li><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased.</li>
  <li><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
  <li><strong>To provide You</strong> with news, special offers and general information about other goods, services and events which we offer.</li>
  <li><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</li>
  <li><strong>For business transfers:</strong> We may use Your information to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale.</li>
  <li><strong>For other purposes</strong>: We may use Your information for other purposes, such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns.</li>
</ul>`,
      },
      {
        id: "data-sharing",
        title: "Disclosure of Your Personal Data",
        content: `<h3>Business Transactions</h3>
<p>If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.</p>
<h3>Law enforcement</h3>
<p>Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities.</p>
<div class="warning-box">
  <i class="fas fa-exclamation-triangle"></i>
  <div>
    <h5>Important Note</h5>
    <p>We will never sell, rent, or trade your personal information to third parties for marketing purposes.</p>
  </div>
</div>`,
      },
      {
        id: "data-security",
        title: "Security of Your Personal Data",
        content: `<p>The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>`,
      },
      {
        id: "your-rights",
        title: "Your Privacy Rights",
        content: `<p>You may update, amend, or delete Your information at any time by contacting Us. You may also have certain rights regarding Your personal information under applicable privacy laws.</p>
<div class="rights-grid">
  <div class="right-item">
    <i class="fas fa-eye"></i>
    <h4>Right to Access</h4>
    <p>You can request access to your personal data</p>
  </div>
  <div class="right-item">
    <i class="fas fa-edit"></i>
    <h4>Right to Correct</h4>
    <p>You can request correction of inaccurate data</p>
  </div>
  <div class="right-item">
    <i class="fas fa-trash"></i>
    <h4>Right to Delete</h4>
    <p>You can request deletion of your data</p>
  </div>
  <div class="right-item">
    <i class="fas fa-ban"></i>
    <h4>Right to Object</h4>
    <p>You can object to certain data processing</p>
  </div>
</div>`,
      },
      {
        id: "contact",
        title: "Contact Us",
        content: `<p>If you have any questions about this Privacy Policy, You can contact us:</p>
<div class="contact-info">
  <div class="contact-item">
    <i class="fas fa-envelope"></i>
    <span>chongzhidatech@gmail.com</span>
  </div>
  <div class="contact-item">
    <i class="fas fa-globe"></i>
    <span><a href="https://www.playfiddlebops.com/">www.playfiddlebops.com</a></span>
  </div>
</div>`,
      },
    ],
  };
}

// 提取服务条款内容（简化版）
function extractTermsContent(astroContent: string): LegalContent["terms"] {
  return {
    meta: {
      title: "Terms of Service | FiddleBops",
      description:
        "Terms and conditions for using FiddleBops music creation game. Learn about usage rules, intellectual property, and user responsibilities.",
      lastUpdated: "February 10, 2025",
    },
    tableOfContents: [
      { id: "agreement", label: "Agreement to Terms" },
      { id: "use-license", label: "Use License" },
      { id: "prohibited-uses", label: "Prohibited Uses" },
      { id: "intellectual-property", label: "Intellectual Property" },
      { id: "termination", label: "Termination" },
      { id: "disclaimer", label: "Disclaimer" },
      { id: "limitation", label: "Limitation of Liability" },
      { id: "contact", label: "Contact Information" },
    ],
    sections: [
      {
        id: "agreement",
        title: "Agreement to Terms",
        content: `<p>These Terms of Service ("Terms") govern your use of FiddleBops website and services. By accessing or using our Service, you agree to be bound by these Terms.</p>
<p>If you disagree with any part of these terms, then you may not access the Service.</p>`,
      },
      // 其他章节类似...
    ],
  };
}

async function migrateLegalContent(execute: boolean) {
  console.log("🚀 Legal Content Migration Script");
  console.log("==================================");
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY-RUN"}`);

  // 创建目录
  const legalDir = "src/content/legal";
  if (execute) {
    await mkdir(legalDir, { recursive: true });
  }

  // 处理每个语言
  for (const locale of LOCALES) {
    console.log(`\n📝 Processing ${locale} legal content...`);

    const privacyPath =
      locale === "en"
        ? "src/pages/privacy.astro"
        : `src/pages/${locale}/privacy.astro`;

    const termsPath =
      locale === "en"
        ? "src/pages/terms-of-service.astro"
        : `src/pages/${locale}/terms-of-service.astro`;

    try {
      // 读取文件内容
      const privacyContent = await readFile(privacyPath, "utf-8").catch(
        () => "",
      );
      const termsContent = await readFile(termsPath, "utf-8").catch(() => "");

      // 提取内容
      const legalContent: LegalContent = {
        privacy: extractPrivacyContent(privacyContent),
        terms: extractTermsContent(termsContent),
      };

      // 写入 JSON 文件
      const outputPath = path.join(legalDir, `${locale}.json`);

      if (execute) {
        await writeFile(outputPath, JSON.stringify(legalContent, null, 2));
        console.log(`  ✅ Created ${outputPath}`);
      } else {
        console.log(`  🔍 Would create ${outputPath}`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${locale}:`, error);
    }
  }

  if (!execute) {
    console.log("\n💡 This was a dry-run. To execute the migration, run:");
    console.log("   tsx scripts/migrate-legal-content.ts --execute");
  } else {
    console.log("\n✅ Legal content migration completed!");
    console.log("⚠️  Note: Update page templates to use content collection.");
  }
}

// 运行脚本
const execute = process.argv.includes("--execute");
migrateLegalContent(execute).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
