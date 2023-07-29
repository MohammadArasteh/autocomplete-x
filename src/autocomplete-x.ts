import { debounce, throttle } from "./utility-functions";
import {
  IAutoCompleteParameters,
  TAutoCompleteItem,
  TAutoCompleteItemRule,
} from "./type";
import "./styles.css";

function autocompleteX<TData>(params: IAutoCompleteParameters<TData>) {
  //#region variables
  let previousItems: Array<TAutoCompleteItem<TData>> = [];
  let items: Array<TAutoCompleteItem<TData>> = [];

  let currentValue: TAutoCompleteItem<TData> | null =
    params.currentValue || null;
  let currentValueIndex: number = -1;

  let currentFocusedItem: TAutoCompleteItem<TData> | null = null;
  let currentFocusedItemIndex: number = -1;

  let valueChanged: boolean = false;
  let isOpen: boolean = false;
  let previousQuery: string = "";
  let query: string = "";
  let previousPage: number = 0;
  let page: number = 0;
  let listScrollTop: number = 0;
  let fetchingFinished: boolean = false;
  //#endregion variables

  //#region elements
  const inputContainer = document.createElement("div");
  inputContainer.className = "ray-grid-autocomplete-container";
  if (params.className) inputContainer.classList.add(params.className);

  const inputElement = document.createElement("input");
  inputElement.className = "ray-grid-autocomplete-input";
  if (params.placeholder) inputElement.placeholder = params.placeholder;
  if (currentValue) inputElement.value = currentValue.label;

  const listContainerElement = document.createElement("div");
  listContainerElement.className = "ray-grid-autocomplete-list";

  inputContainer.append(inputElement);
  //#endregion elements

  //#region event listeners
  inputElement.onfocus = (event) => {
    // (event.target as HTMLInputElement).select();
  };
  inputElement.onclick = (event) => {
    if (!isOpen) {
      inputElement.select();
      if (params.showOnFocus) checkItems().then(openDropdown);
    }
  };
  inputElement.addEventListener(
    "input",
    debounce(async (event) => {
      page = 0;
      listScrollTop = 0;
      fetchingFinished = false;
      const currentElement = event.target as HTMLInputElement;
      query = currentElement.value;
      const data = await params.datasource(query, page);
      setItemsToList(data);
      listContainerElement.scrollTo({ top: listScrollTop });
    })
  );
  inputElement.addEventListener("keydown", async (event) => {
    switch (event.key) {
      case "ArrowUp":
      case "ArrowDown": {
        inputElement.select(); // does not work
        changeHighlightByArrowKey(event.key);
        break;
      }
      case "Enter": {
        event.stopPropagation();
        if (currentFocusedItem) {
          updateSelectedItem(currentFocusedItem, currentFocusedItemIndex, true);
          if (params.onSelect) params.onSelect(currentFocusedItem.value);
          inputElement.value = currentValue!.label;
          if (params.closeAfterSelect) closeDropdown();
        }
        break;
      }
      case "Escape": {
        closeDropdown();
        break;
      }
    }
  });

  if (params.lazyFetch)
    listContainerElement.addEventListener(
      "scroll",
      throttle(async (event) => {
        const element = event.target as HTMLDivElement;
        if (fetchingFinished) return;
        if (element.scrollHeight <= element.offsetHeight + element.scrollTop) {
          page = page + 1;
          const newItems = await params.datasource(query, page);
          fetchingFinished = newItems.length === 0;
          addItemsToList(newItems);
        }
      })
    );
  //#endregion event listeners

  const changeHighlightByArrowKey = throttle(function (
    key: "ArrowUp" | "ArrowDown"
  ) {
    if (!isOpen) return checkItems().then(openDropdown);
    let index = currentFocusedItemIndex + (key === "ArrowDown" ? +1 : -1);
    if (index < 0) index = items!.length - 1;
    index = index % items!.length;
    updateCurrentFocusedItem(index);
  },
  100);
  function removeHighlightedItem() {
    const previousItemElement =
      listContainerElement.children[currentFocusedItemIndex];
    if (previousItemElement)
      previousItemElement.classList.remove(
        "ray-grid-autocomplete-highlighted-item"
      );
    currentFocusedItem = null;
    currentFocusedItemIndex = -1;
  }
  function updateSelectedItem(
    item: TAutoCompleteItem<TData>,
    index: number,
    changed: boolean = false
  ) {
    valueChanged = changed;
    const previousItemElement =
      listContainerElement.children[currentValueIndex];
    if (previousItemElement)
      previousItemElement.classList.remove(
        "ray-grid-autocomplete-selected-item"
      );

    // previousItems = structuredClone(items);
    previousQuery = query;
    previousPage = page;
    currentValue = item;
    currentValueIndex = index;

    const element = listContainerElement.children[
      currentValueIndex
    ] as HTMLDivElement;
    if (element) element.classList.add("ray-grid-autocomplete-selected-item");
    // inputElement.focus();
  }
  async function checkItems() {
    if (items.length === 0) {
      const data = await params.datasource(query, page);
      previousItems = structuredClone(data);
      setItemsToList(data);
    }
  }
  function openDropdown() {
    valueChanged = false;
    isOpen = true;
    document.addEventListener("click", onClickDocument);
    inputContainer.appendChild(listContainerElement);
    listContainerElement.scrollTo({ top: listScrollTop });
  }
  function closeDropdown() {
    if (inputElement.value === "" && params.nullable) {
      currentValue = null;
      currentValueIndex = -1;
      params.onSelect && params.onSelect(currentValue);
      inputElement.value = "";
      previousQuery = "";
      query = "";
      previousPage = 0;
      page = 0;
      items = [];
    } else if (valueChanged === false) {
      inputElement.value = currentValue?.label || "";
      query = previousQuery;
      page = previousPage;
      setItemsToList(previousItems);
    } else if (inputElement.value === "") {
      return;
    }
    if (!isOpen) return;
    isOpen = false;
    listScrollTop = listContainerElement.scrollTop;
    inputContainer.removeChild(listContainerElement);
    document.removeEventListener("click", onClickDocument);
  }

  function setItemsToList(list: Array<TAutoCompleteItem<TData>> | null) {
    listContainerElement.innerHTML = "";
    items = [];
    addItemsToList(list);
    if (currentValue && query === previousQuery)
      updateSelectedItem(currentValue, currentValueIndex);
  }

  function addItemsToList(list: Array<TAutoCompleteItem<TData>> | null) {
    if (list == null) return;
    const itemsElementList: Array<HTMLDivElement> = list.map((item, index) => {
      const idx = items!.length + index;
      const element = document.createElement("div");
      element.className = "ray-grid-autocomplete-list-item";

      // handle rules
      const rules = extractRules(item, params.classRules || []);
      for (const rule of rules) element.classList.add(...rule.classNames);

      // handle rendering
      if (params.render) element.append(params.render(item.value));
      else {
        const titleElement = document.createElement("span");
        titleElement.innerHTML = item.label;
        element.append(titleElement);
      }

      element.onclick = () => onItemClick(item, idx);
      element.onmouseenter = () => updateCurrentFocusedItem(idx);

      return element;
    });
    items.push(...list);
    if (query === previousQuery) previousItems = structuredClone(items);
    listContainerElement.append(...itemsElementList);
  }

  function onItemClick(item: TAutoCompleteItem<TData>, itemIndex: number) {
    updateSelectedItem(item, itemIndex, true);
    if (params.onSelect) params.onSelect(item.value);
    inputElement.value = currentValue!.label;
    if (params.closeAfterSelect) closeDropdown();
  }

  function updateCurrentFocusedItem(index: number) {
    removeHighlightedItem();

    currentFocusedItem = items[index];
    currentFocusedItemIndex = index;

    const element = listContainerElement.children[
      currentFocusedItemIndex
    ] as HTMLDivElement;
    element.classList.add("ray-grid-autocomplete-highlighted-item");

    if (
      element.offsetTop >=
      listContainerElement.scrollTop + listContainerElement.offsetHeight
    )
      listContainerElement.scrollTo({ top: element.offsetTop });
    else if (element.offsetTop <= listContainerElement.scrollTop)
      listContainerElement.scrollTo({ top: element.offsetTop });
  }

  function extractRules(
    item: TAutoCompleteItem<TData>,
    rules: Array<TAutoCompleteItemRule<TData>>
  ) {
    const result: Array<TAutoCompleteItemRule<TData>> = [];
    rules.forEach((rule) => {
      let doesMatch: boolean = false;
      if (typeof rule.rule === "function") doesMatch = rule.rule(item);
      else doesMatch = new Function("data", `return ${rule.rule}`)(item.value);
      if (doesMatch) result.push(rule);
    });
    return result;
  }

  const onClickDocument = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    // const inputStartX = inputContainer.offsetLeft;
    // const inputStartY = inputContainer.offsetTop;
    // const inputHeight = inputContainer.clientHeight;
    // const inputWidth = inputContainer.clientWidth;

    // const listStartX = inputStartX + listContainerElement.offsetLeft;
    // const listStartY = inputStartY + listContainerElement.offsetTop;
    // const listEndX = listStartX + listContainerElement.offsetWidth;
    // const listEndY = listStartY + listContainerElement.offsetHeight;

    // const mouseX = event.clientX;
    // const mouseY = event.clientY;

    // const clickedInsideInput = isPointerInArea(
    //   { mouseX, mouseY },
    //   {
    //     startX: inputStartX,
    //     endX: inputStartX + inputWidth,
    //     startY: inputStartY,
    //     endY: inputStartY + inputHeight,
    //   }
    // );
    // const clickedInsideList = isPointerInArea(
    //   {
    //     mouseX,
    //     mouseY,
    //   },
    //   {
    //     startX: listStartX,
    //     endX: listEndX,
    //     startY: listStartY,
    //     endY: listEndY,
    //   }
    // );

    const clickedInsideInput = target.classList.contains(
      "ray-grid-autocomplete-input"
    );
    const clickedInsideList = target.classList.contains(
      "ray-grid-autocomplete-list-item"
    );

    if (!clickedInsideInput && !clickedInsideList) closeDropdown();
  };

  function onDestroy() {}

  return { element: inputContainer, destroy: onDestroy };
}

function isPointerInArea(
  pointer: { mouseX: number; mouseY: number },
  area: { startX: number; endX: number; startY: number; endY: number }
) {
  return (
    pointer.mouseX >= area.startX &&
    pointer.mouseX <= area.endX &&
    pointer.mouseY >= area.startY &&
    pointer.mouseY <= area.endY
  );
}

export default autocompleteX;
