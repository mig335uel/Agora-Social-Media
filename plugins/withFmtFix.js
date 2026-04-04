const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContents = fs.readFileSync(podfilePath, 'utf8');

      // Este bloque le dice a Xcode que compile 'fmt' usando C++17 en lugar de C++20
      const fixSnippet = `
    # Workaround for Xcode fmt consteval bug
    if target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
`;

      // Lo inyectamos dentro del bloque post_install existente
      if (!podfileContents.includes("target.name == 'fmt'")) {
        podfileContents = podfileContents.replace(
          /post_install do \|installer\|/g,
          `post_install do |installer|\n${fixSnippet}`
        );
        fs.writeFileSync(podfilePath, podfileContents);
      }

      return config;
    },
  ]);
};

module.exports = withFmtFix;