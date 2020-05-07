build:
	tsc app.ts --lib es7,dom --out app.js

watch:
	tsc app.ts --lib es7,dom --out app.js --watch