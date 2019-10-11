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
      state: 'empty',
      url: '',
    },
    request: {
      state: '',
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

  watch(appState.form, 'state', () => {
    const { state } = appState.form;
    warningNode.classList.add('d-none');
    switch (state) {
      case 'is-valid':
        inputField.classList.remove('is-invalid');
        inputField.classList.add(state);
        addLinkBtn.disabled = false;
        break;
      case 'is-invalid':
        inputField.classList.remove('is-valid');
        inputField.classList.add(state);
        addLinkBtn.disabled = true;
        break;
      default:
        inputField.className = 'form-control';
        addLinkBtn.disabled = true;
        break;
    }
  });

  watch(appState.request, 'state', () => {
    const { request } = appState;
    if (request.state === 'processing') {
      [...loadingIndicator.children].forEach(({ classList }) => classList.remove('d-none'));
      inputField.disabled = true;
      addLinkBtn.classList.replace('align-self-start', 'align-self-end');
      return;
    }
    if (request.state === 'successful') {
      inputField.value = '';
      mainTitles.classList.remove('d-none');
      content.classList.remove('d-none');
    }
    if (request.state === 'failed') {
      const errKey = request.responseStatus;
      warningNode.innerText = i18next.t([`${errKey}`, 'unspecific']);
      warningNode.classList.remove('d-none');
    }
    inputField.disabled = false;
    addLinkBtn.classList.replace('align-self-end', 'align-self-start');
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
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
    if (value.length === 0) {
      appState.form.state = 'empty';
      return;
    }
    const sameFeed = appState.feeds.find(({ url }) => url === value);
    const isLinkValid = validator.isURL(value) && !sameFeed;
    form.state = isLinkValid ? 'is-valid' : 'is-invalid';
    form.url = isLinkValid ? value : '';
  });

  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { request, form, feeds } = appState;
    request.state = 'processing';
    form.state = 'processing';
    axios.get(`https://cors-anywhere.herokuapp.com/${form.url}`)
      .then(({ data }) => {
        const parsedData = parseRss(data, feeds);
        request.state = 'successful';
        return parsedData;
      })
      .then(({ feedInfo, postData }) => {
        const feedsListSize = feeds.length;
        const feedId = `rssFeed${feedsListSize + 1}`;
        updatePosts(postData, feedId, appState);
        updateFeeds(feedInfo, feedId, form.url, appState);
      })
      .catch((err) => {
        form.state = 'is-invalid';
        request.state = 'failed';
        if (err.response) {
          request.responseStatus = err.response.status;
          throw new Error(err);
        }
        const [statusType] = err.message.split(' ');
        request.responseStatus = statusType;
        throw new Error(err);
      });
  });
};
