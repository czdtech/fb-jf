module.exports = {
  process(sourceText) {
    return {
      code: sourceText
        .replace(
          /import\.meta\.env\.DEV/g,
          'process.env.NODE_ENV !== "production"',
        )
        .replace(
          /import\.meta\.env\.PROD/g,
          'process.env.NODE_ENV === "production"',
        )
        .replace(/import\.meta\.env\.MODE/g, '"test"')
        .replace(
          /import\.meta\.env\.PUBLIC_SITE_URL/g,
          '(process.env.PUBLIC_SITE_URL || "https://www.playfiddlebops.com")',
        )
        .replace(/import\.meta\.env/g, "({})"),
    };
  },
};
