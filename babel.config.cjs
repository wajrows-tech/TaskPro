module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
    ],
    plugins: [
        [
            'module-resolver',
            {
                root: ['./src'],
                extensions: ['.ts', '.js', '.json'],
                alias: {
                    // Strip .ts extensions from explicit imports
                    '^(.+)\\.ts$': '\\1'
                }
            }
        ]
    ]
};
