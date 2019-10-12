import axios from 'axios';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import i18next from 'i18next';
import resources from '../locales/descriptions';
import { parseRss, updateFeeds, updatePosts } from './processors';
import { makePostsList, makeFeedItem } from './htmlMakers';

export default () => {
  i18next.init({
    debug: true,
    lng: 'descriptions',
    defaultNS: 'errors',
    resources,
  });

  const appState = {
    form: {
      state: 'onInput',
      urlState: 'empty',
      url: '',
      responseStatus: '',
    },
    feeds: [],
    posts: {
      fresh: [],
      all: {},
    },
  };

  const mainTitles = document.getElementById('mainTitles');
  const content = document.getElementById('content');
  const addRssForm = document.getElementById('addRss');
  const [addLinkBtn, inputField] = addRssForm.elements;
  const warningNode = document.getElementById('wrongInput');
  const loadingIndicator = document.getElementById('linkLoading');
  const feedsListTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');

  watch(appState.form, 'urlState', () => {
    const { urlState } = appState.form;
    inputField.className = 'form-control';
    if (urlState === 'is-valid') {
      inputField.classList.add(urlState);
      addLinkBtn.disabled = false;
    }
    if (urlState === 'is-invalid') {
      inputField.classList.add(urlState);
    }
  });

  watch(appState.form, 'state', () => {
    const { state, responseStatus } = appState.form;
    inputField.disabled = false;
    warningNode.classList.add('d-none');
    addLinkBtn.disabled = true;
    addLinkBtn.classList.replace('align-self-end', 'align-self-start');
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
    if (state === 'processing') {
      [...loadingIndicator.children].forEach(({ classList }) => classList.remove('d-none'));
      inputField.disabled = true;
      inputField.className = 'form-control';
      addLinkBtn.classList.replace('align-self-start', 'align-self-end');
    }
    if (state === 'processed') {
      inputField.value = '';
      mainTitles.classList.remove('d-none');
      content.classList.remove('d-none');
    }
    if (state === 'failed') {
      warningNode.innerText = i18next.t([`${responseStatus}`, 'unspecific']);
      warningNode.classList.remove('d-none');
    }
  });

  watch(appState, 'feeds', () => {
    makeFeedItem(appState.feeds, feedsListTag);
  });

  watch(appState.posts, 'fresh', () => {
    const { fresh } = appState.posts;
    makePostsList(fresh, newsTag);
  });


  inputField.addEventListener('input', ({ target }) => {
    const { form } = appState;
    const { value } = target;
    form.state = 'onInput';
    if (value.length === 0) {
      form.urlState = 'empty';
      return;
    }
    const sameFeed = appState.feeds.find(({ url }) => url === value);
    const isLinkValid = validator.isURL(value) && !sameFeed;
    form.urlState = isLinkValid ? 'is-valid' : 'is-invalid';
    form.url = isLinkValid ? value : '';
  });

  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { form, feeds } = appState;
    form.state = 'processing';
    axios.get(`https://cors-anywhere.herokuapp.com/${form.url}`)
      .then(({ data }) => {
        const parsedData = parseRss(data, feeds);
        form.state = 'processed';
        form.urlState = 'empty';
        return parsedData;
      })
      .then(({ feedInfo, postData }) => {
        const feedsListSize = feeds.length;
        const feedId = `rssFeed${feedsListSize + 1}`;
        updatePosts(postData, feedId, appState);
        updateFeeds(feedInfo, feedId, form.url, appState);
      })
      .catch((err) => {
        form.urlState = 'is-invalid';
        form.state = 'failed';
        if (err.response) {
          form.responseStatus = err.response.status;
          throw new Error(err);
        }
        const [statusType] = err.message.split(' ');
        form.responseStatus = statusType;
        throw new Error(err);
      });
  });
};
