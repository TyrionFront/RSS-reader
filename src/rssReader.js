import { watch } from 'melanke-watchjs';
import i18next from 'i18next';
import $ from 'jquery';
import resources from '../locales/descriptions';
import {
  processTypedUrl, processFormData, processSearch, changeFeed,
} from './processors';
import { makePostsList, makeFeedItem, displayHidePosts } from './htmlMakers';

export default () => {
  i18next.init({
    debug: true,
    lng: 'descriptions',
    defaultNS: 'errors',
    resources,
  });

  const appState = {
    addRss: {
      state: 'onInput',
      urlState: 'empty',
      url: '',
      responseStatus: '',
    },
    feeds: {
      state: 'not-updating',
      activeFeedId: '',
      timerId: '',
      list: [],
    },
    posts: {
      fresh: [],
      all: [],
      selected: [],
    },
    search: {
      state: 'onInput',
      inputState: 'empty',
      text: '',
      basicColl: [],
    },
  };

  const content = document.getElementById('content');
  const addRssForm = document.getElementById('addRss');
  const [addLinkBtn, urlInputField] = addRssForm.elements;
  const searchForm = document.getElementById('postsSearch');
  const [searchInput, searchButton] = searchForm;
  const warningNode = document.getElementById('processingErr');
  const feedsListTag = document.getElementById('rssFeedsList');
  const postsListTag = document.getElementById('postsList');

  watch(appState.addRss, 'urlState', () => {
    const { urlState } = appState.addRss;
    const [value, warning] = urlState.split(' ');
    urlInputField.className = 'form-control';
    addLinkBtn.disabled = true;
    switch (value) { // eslint-disable-line default-case
      case 'is-valid':
        urlInputField.classList.add(value);
        addLinkBtn.disabled = false;
        break;
      case 'is-invalid':
        urlInputField.classList.add(value);
        warningNode.innerText = i18next.t([`${warning}`, 'unspecific']);
        break;
    }
  });

  const { placeholder } = urlInputField;
  const loadingIndicator = document.getElementById('linkLoading');
  watch(appState.addRss, 'state', () => {
    const { state, responseStatus, url } = appState.addRss;
    urlInputField.disabled = false;
    addLinkBtn.disabled = true;
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
    switch (state) { // eslint-disable-line default-case
      case 'processing':
        [...loadingIndicator.children].forEach(({ classList }) => classList.remove('d-none'));
        urlInputField.disabled = true;
        urlInputField.placeholder = '';
        urlInputField.value = '';
        urlInputField.className = 'form-control';
        break;
      case 'processed':
        content.classList.remove('d-none');
        urlInputField.placeholder = placeholder;
        searchInput.disabled = false;
        break;
      case 'failed':
        urlInputField.value = url;
        warningNode.innerText = i18next.t([`${responseStatus}`, 'unspecific']);
        break;
    }
  });

  const markActive = ({ currentTarget }) => {
    const currentId = currentTarget.id;
    changeFeed(currentId, appState);
  };
  const feedsCountTag = document.getElementById('feedsBadge');

  watch(appState.feeds, 'list', () => {
    const { list } = appState.feeds;
    makeFeedItem(appState.feeds.list, feedsListTag, markActive);
    feedsCountTag.innerText = list.length;
  }, 1);

  watch(appState.feeds, 'activeFeedId', () => {
    const feedElements = [...feedsListTag.children];
    const { activeFeedId } = appState.feeds;
    const [activeIdValue, sameId] = activeFeedId.split('-');
    if (activeIdValue === 'sameFeed') {
      const currentFeedElem = feedElements.find(({ id }) => id === sameId);
      currentFeedElem.classList.toggle('active');
      return;
    }
    const currentFeed = feedElements.find(({ id }) => id === activeIdValue);
    const prevActiveFeed = feedElements.find(({ classList }) => classList.contains('active'));
    const feedsPair = prevActiveFeed ? [currentFeed, prevActiveFeed] : [currentFeed];
    feedsPair.forEach(({ classList }) => classList.toggle('active'));
  });

  const getElement = (coll, ...ids) => {
    const tagId = ids.length > 1 ? `${ids.join('-')}` : ids;
    let htmlTag = coll[tagId];
    if (!htmlTag) {
      htmlTag = document.getElementById(tagId);
      coll[tagId] = htmlTag; // eslint-disable-line no-param-reassign
    }
    return htmlTag;
  };
  const postsCountTag = document.getElementById('postsBadge');
  const feedsBadges = {};

  watch(appState.posts, 'fresh', () => {
    const { fresh, all } = appState.posts;
    const { list } = appState.feeds;
    const [activeFeedId] = appState.feeds.activeFeedId.split('-');
    const [currentFeedId] = fresh;
    const { postsCount } = list.find(({ feedId }) => feedId === currentFeedId);
    const currentFeedBadge = getElement(feedsBadges, currentFeedId, 'badge');
    const { text, state } = appState.search;
    const postsList = makePostsList(fresh, activeFeedId, text);
    postsListTag.prepend(...postsList);
    currentFeedBadge.innerText = postsCount;
    if (state === 'hasValues' || state === 'onSearch') {
      return;
    }
    if (activeFeedId === currentFeedId) {
      postsCountTag.innerText = postsCount;
      return;
    }
    if (!activeFeedId || activeFeedId === 'sameFeed') {
      postsCountTag.innerText = all.length;
    }
  });

  watch(appState.posts, 'selected', () => {
    const { selected, all } = appState.posts;
    const publishedPosts = [...postsListTag.children];
    const coll = selected.length > 0 ? selected : all;
    const { search } = appState;
    const searchText = search.state === 'hasValues' ? search.text : '';
    displayHidePosts([...coll], publishedPosts, searchText);
    postsCountTag.innerText = coll.length;
  });

  watch(appState.search, 'inputState', () => {
    const { inputState } = appState.search;
    searchInput.className = 'form-control text-center';
    searchButton.disabled = true;
    $(searchButton).popover('dispose');
    switch (inputState) { // eslint-disable-line default-case
      case 'matched':
        searchInput.classList.add('is-valid');
        searchButton.disabled = false;
        $(searchButton).popover('show');
        break;
      case 'noMatches':
        searchInput.classList.add('is-invalid');
        break;
    }
  });

  watch(appState.search, 'state', () => {
    if (appState.search.state === 'hasValues') {
      searchButton.disabled = true;
      $(searchButton).popover('dispose');
    }
  });

  urlInputField.addEventListener('input', ({ target }) => {
    const { value } = target;
    processTypedUrl(appState, value);
  });

  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processFormData(appState);
  });

  searchInput.addEventListener('input', ({ target }) => {
    const { value } = target;
    const { search, posts } = appState;
    const { all } = posts;
    const [activeFeedId] = appState.feeds.activeFeedId.split('-');
    const coll = !activeFeedId || activeFeedId === 'sameFeed'
      ? all : all.filter(({ postId }) => postId.includes(activeFeedId));
    search.state = 'onInput';
    search.inputState = 'typing';
    search.text = '';
    if (value.length === 0) {
      search.state = 'empty';
      search.inputState = 'empty';
      posts.selected = coll;
      return;
    }
    const str = value.trim().length > 0 ? value.toLowerCase() : '';
    if (str) {
      search.state = 'onSearch';
      search.text = value;
      search.basicColl = coll;
      processSearch(coll, str, appState);
    }
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { search, posts } = appState;
    const foundPosts = search.basicColl
      .filter(({ postTitle }) => postTitle.toLowerCase().includes(search.text));
    search.state = 'hasValues';
    posts.selected = foundPosts;
  });
};
