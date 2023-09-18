extern crate proc_macro;
use proc_macro::TokenStream;
use quote::{format_ident, quote};
use syn::{parse_macro_input, ItemFn};

mod error;

#[proc_macro_attribute]
pub fn enforce_single_instance(_attrs: TokenStream, input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
    let mut input = parse_macro_input!(input as ItemFn);
    let ret_type = match &input.sig.output {
        syn::ReturnType::Default => quote!(),
        syn::ReturnType::Type(_, ty) => quote!(-> #ty),
    };

    // Clone the function name and generate a unique mutex name based on the function name
    let fn_name = input.sig.ident.clone();
    let mutex_name = format_ident!("{}_MUTEX", fn_name.to_string().to_uppercase());
    let original_fn_name = format_ident!("{}_original", fn_name);
    let vis = &input.vis;
    let asyncness = &input.sig.asyncness;
    let args = &input.sig.inputs;

    // Extract argument names to pass them to the original function
    let arg_names: Vec<_> = args
        .iter()
        .filter_map(|arg| {
            if let syn::FnArg::Typed(pat) = arg {
                if let syn::Pat::Ident(pat_ident) = &*pat.pat {
                    return Some(&pat_ident.ident);
                }
            }
            None
        })
        .collect();

    // Rename the original function
    input.sig.ident = original_fn_name.clone();

    // Check if the function is async
    let call_original = if asyncness.is_some() {
        quote! { #original_fn_name(#(#arg_names),*).await; }
    } else {
        quote! { #original_fn_name(#(#arg_names),*); }
    };

    // Generate the new function with a Mutex check
    let expanded = quote! {
        #input

        lazy_static! {
            static ref #mutex_name: tokio::sync::Mutex<Option<()>> = tokio::sync::Mutex::new(None);
        }

        #vis #asyncness fn #fn_name(#args) #ret_type {
            let mut lock = #mutex_name.lock().await;
            if lock.is_none() {
                *lock = Some(());
                let result = #call_original;
                *lock = None;
                return result;
            } else {
                println!("{} is already running", stringify!(#fn_name));
                return Err(Error::Custom(format!("{} is already running", stringify!(#fn_name))));
            }
        }
    };
    // Return the generated token stream
    TokenStream::from(expanded)
}
