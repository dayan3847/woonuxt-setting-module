import { defineNuxtModule } from '@nuxt/kit';
import { $fetch } from 'ohmyfetch';

const getVersionQuery = `query getVersion {
  woonuxtSettings {
    wooCommerceSettingsVersion
  }
}`;

// Module options TypeScript inteface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: { name: 'woonuxt', configKey: 'woonuxt' },
  async setup(_, nuxt) {
    const GQL_HOST = process.env.GQL_HOST ?? null;
    const LATEST_VERSION = 1056;
    let WOONUXT_SETTINGS_PLUGIN_VERSION = 0;

    if (!GQL_HOST) {
      console.log('\u001B[1;35mGQL_HOST is missing. Make sure you have the GQL_HOST environment variable set.');
      return;
    }

    // Get the version of the woonuxt-settings plugin
    try {
      const { data } = await $fetch(GQL_HOST, { method: 'POST', body: JSON.stringify({ query: getVersionQuery }) });
      const stringVersion = data.woonuxtSettings?.wooCommerceSettingsVersion.replace(/\D/g, '');
      WOONUXT_SETTINGS_PLUGIN_VERSION = parseFloat(stringVersion);
      if (WOONUXT_SETTINGS_PLUGIN_VERSION < LATEST_VERSION) {
        console.log('\u001B[1;35mThere is a new version of woonuxt-settings plugin available. Please update it.');
      }
    } catch (error) {}

    const wooNuxtSEO = WOONUXT_SETTINGS_PLUGIN_VERSION > 1043 ? 'wooNuxtSEO { provider url handle }' : '';
    const currencyCode = WOONUXT_SETTINGS_PLUGIN_VERSION > 1055 ? 'currencyCode' : '';
    const currencySymbol = WOONUXT_SETTINGS_PLUGIN_VERSION > 1055 ? 'currencySymbol' : '';

    const woonuxtSettings = `{
        primary_color
        logo
        publicIntrospectionEnabled
        frontEndUrl
        productsPerPage
        maxPrice
        global_attributes {
          slug
          showCount
          openByDefault
          label
          hideEmpty
        }
        stripeSettings {
          enabled
          testmode
          test_publishable_key
          publishable_key
        }
        ${wooNuxtSEO}
        ${currencyCode}
        ${currencySymbol}
    }`;

    const query = `
    query getWooNuxtSettings {
      woonuxtSettings ${woonuxtSettings}
      generalSettings { title }
    }`;

    try {
      const { data } = await $fetch(GQL_HOST, {
        method: 'POST',
        body: JSON.stringify({ query }),
      });

      // Default env variables
      process.env.PRIMARY_COLOR = data.woonuxtSettings?.primary_color || '#7F54B2';

      // Default runtimeConfig
      nuxt.options.runtimeConfig.public.LOGO = data.woonuxtSettings?.logo || null;
      nuxt.options.runtimeConfig.public.PRODUCTS_PER_PAGE = data.woonuxtSettings?.productsPerPage || process.env.PRODUCTS_PER_PAGE || 24;
      nuxt.options.runtimeConfig.public.GLOBAL_PRODUCT_ATTRIBUTES = data.woonuxtSettings?.global_attributes || [];
      nuxt.options.runtimeConfig.public.MAX_PRICE = data.woonuxtSettings?.maxPrice || 1000;
      nuxt.options.runtimeConfig.public.FRONT_END_URL = data.woonuxtSettings?.frontEndUrl || null;
      nuxt.options.runtimeConfig.public.CURRENCY_CODE = data.woonuxtSettings?.currencyCode || null;
      nuxt.options.runtimeConfig.public.CURRENCY_SYMBOL = data.woonuxtSettings?.currencySymbol || null;
      nuxt.options.runtimeConfig.public.WOO_NUXT_SEO = data.woonuxtSettings?.wooNuxtSEO || null;

      // Site title
      process.env.SITE_TITLE = data.generalSettings?.title || 'WooNuxt';

      // Stripe
      if (data.woonuxtSettings?.stripeSettings?.enabled) {
        nuxt.options.runtimeConfig.public.STRIPE_PUBLISHABLE_KEY =
          data.woonuxtSettings?.stripeSettings?.testmode === 'yes'
            ? data.woonuxtSettings?.stripeSettings?.test_publishable_key
            : data.woonuxtSettings?.stripeSettings?.publishable_key;
      }
    } catch (error) {
      console.error(error);
      console.log(
        '\u001B[1;35mError fetching woonuxt settings. Make sure you have the latest version woonuxt-settings plugin installed on WordPress. https://github.com/scottyzen/woonuxt-settings'
      );
    }
  },
});
