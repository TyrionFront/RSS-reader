import axios from 'axios';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import { parseRss, updateRssState, updateNewsState } from './processors';
import { updateView, makeNewsList, makeFeedItem } from './htmlMakers';

export default () => {
  const appState = {
    links: {
      typedLink: {
        isEmpty: true,
        isValid: false,
      },
      workableUrls: new Set(),
      allVisitedUrls: {},
    },
    warning: {
      input: {
        isExist: false,
        warningMessage: '',
      },
      refreshing: {
        isExist: false,
        warningMessage: '',
      },
    },
    feeds: {
      lastFeedId: '',
      allFeedsInfo: {},
      activeFeedId: '',
      prevActiveFeedId: '',
      items: {
        freshNews: [],
        allNews: new Map(),
        allNewsTitles: new Set(),
        refreshingCount: 0,
      },
      refreshingIsNotStarted: true,
    },
    rssFormState: {
      atTheBottom: false,
    },
  };

  const mainTitles = document.getElementById('mainTitles');
  const addRssForm = document.getElementById('addRss');
  const [addLinkBtn, inputField] = addRssForm.elements;
  const warningNode = document.getElementById('wrongInput');
  const loadingIndicator = document.getElementById('linkLoading');
  const feedsListTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');

  watch(appState.links, 'typedLink', () => {
    inputField.classList.toggle('is-invalid');
    addLinkBtn.disabled = !appState.links.typedLink.isValid;
  });

  watch(appState.links, 'allVisitedUrls', () => {
    addLinkBtn.disabled = true;
    inputField.disabled = true;
    [...loadingIndicator.children].forEach(({ classList }) => classList.remove('d-none'));
    addLinkBtn.classList.replace('align-self-start', 'align-self-end');
  });

  watch(appState.links.typedLink, 'isValid', () => {
    inputField.classList.toggle('is-valid');
  });

  watch(appState.warning.input, 'isExist', () => {
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
    addLinkBtn.classList.replace('align-self-end', 'align-self-start');
    warningNode.innerText = appState.warning.input.warningMessage;
    warningNode.classList.replace('d-none', 'd-inline');
    inputField.disabled = false;
  });

  watch(appState.warning.input, 'warningMessage', () => {
    warningNode.classList.replace('d-inline', 'd-none');
  });

  watch(appState.feeds, 'lastFeedId', () => {
    inputField.value = '';
    inputField.disabled = false;
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
    addLinkBtn.classList.replace('align-self-end', 'align-self-start');
    mainTitles.classList.remove('d-none');
  });

  watch(appState.rssFormState, 'atTheBottom', () => {
    updateView();
  });

  watch(appState.feeds, 'allFeedsInfo', () => {
    const { lastFeedId, allFeedsInfo } = appState.feeds;
    makeFeedItem(lastFeedId, allFeedsInfo, feedsListTag);
  });

  watch(appState.feeds.items, 'freshNews', () => {
    const { freshNews } = appState.feeds.items;
    const [stories] = freshNews;
    makeNewsList(stories, newsTag);
  });


  inputField.addEventListener('input', ({ target }) => {
    const { warningMessage } = appState.warning.input;
    if (warningMessage) {
      appState.warning.input.warningMessage = '';
    }
    const { value } = target;
    appState.links.typedLink.isEmpty = value.length === 0;
    const { allVisitedUrls } = appState.links;
    const isLinkValid = validator.isURL(value) && allVisitedUrls[value] !== 'visited';
    appState.links.typedLink.isValid = isLinkValid;
  });


  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const link = inputField.value;
    const { allVisitedUrls } = appState.links;
    if (allVisitedUrls[link] !== 'visited') {
      appState.links.allVisitedUrls = { ...allVisitedUrls, [link]: 'visited' };
      axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
        .then(({ data }) => {
          const parsedData = parseRss(data);
          appState.links.workableUrls.add(link);
          appState.links.typedLink.isEmpty = true;
          appState.links.typedLink.isValid = false;
          return parsedData;
        })
        .then(({ feedInfo, newsData }) => {
          if (!appState.rssFormState.atTheBottom) {
            appState.rssFormState.atTheBottom = true;
          }
          const feedId = `rssFeed${appState.links.workableUrls.size}`;
          updateNewsState(newsData, feedId, appState);
          updateRssState(feedInfo, appState);
        })
        .catch((err) => {
          if (!appState.warning.refreshing.isExist) {
            const { isExist } = appState.warning.input;
            appState.warning.input.warningMessage = 'No rss found at this URL';
            appState.links.typedLink.isValid = false;
            appState.warning.input.isExist = !isExist;
          }
          throw new Error(err);
        });
    }
  });
};
