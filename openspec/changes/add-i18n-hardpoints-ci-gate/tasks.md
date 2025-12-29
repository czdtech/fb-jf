## 1. Implementation
- [x] 4.1 实现 `scripts/validate-i18n-hardpoints.mts`（--report-only / --update-baseline / strict / baseline；清晰错误输出）
- [x] 4.2 增加 npm scripts：extract/report/validate/normalize，并接入 `npm run validate:i18n`
- [x] 4.3 配置 CI workflow：PR report-only；main 默认严格（按语言可渐进）
- [x] 4.4 逐步收紧：baseline 过渡 → 当某语言 baseline 清零后，该语言行为等价 strict
