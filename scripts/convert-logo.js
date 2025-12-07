import sharp from 'sharp';
import fs from 'fs';

async function convertLogo() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync('public/logo.svg');

    // Sizes we need for PWA
    const sizes = [
      { name: 'logo-16', size: 16 },
      { name: 'logo-32', size: 32 },
      { name: 'logo-64', size: 64 },
      { name: 'logo-128', size: 128 },
      { name: 'logo-192', size: 192 },
      { name: 'logo-256', size: 256 },
      { name: 'logo-512', size: 512 }
    ];

    console.log('Converting SVG to PNG files...');

    // Convert SVG to different PNG sizes
    for (const { name, size } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size, {
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png({ quality: 90 })
        .toFile(`public/${name}.png`);

      console.log(`✓ Created ${name}.png (${size}x${size})`);
    }

    // Create a simple favicon.ico using the largest PNG as base
    // For true ICO support, you'd need a more complex tool, but this works well for most browsers
    await sharp(svgBuffer)
      .resize(32, 32, {
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile('public/favicon.png');

    console.log('✓ Created favicon.png');

    console.log('\n🎉 Logo conversion complete!');
    console.log('\nGenerated files:');
    console.log('- public/logo-16.png through logo-512.png');
    console.log('- public/favicon.png (use this for browsers that prefer PNG)');
    console.log('- public/logo.svg (original vector)');

    console.log('\n💡 Tip: For a true ICO file with multiple sizes, use:');
    console.log('   - Online converter: https://convertio.co/png-ico/');
    console.log('   - Or ImageMagick: magick logo-16.png logo-32.png logo-64.png favicon.ico');

  } catch (error) {
    console.error('❌ Error converting logo:', error);
  }
}

convertLogo();